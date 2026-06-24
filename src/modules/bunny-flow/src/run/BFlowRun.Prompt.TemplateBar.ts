/**
 * BFlowRun.Prompt.TemplateBar — Handlebars‑driven prompt builder.
 *
 * Implements IBFlowRunPromptBuilder using Handlebars template compilation.
 * Separates concerns into three distinct phases:
 *
 *   1. **Pass 1 — Inline interpolation** — Free‑form prompt strings
 *      (`step.prompts`, `job.prompt`, `pipeline.prompt`) are themselves
 *      compiled as Handlebars templates and rendered against a flat map of
 *      resolved inputs **and** variables. Markers such as `{{topic}}` are
 *      replaced in‑place with their concrete values *before* the outer
 *      template runs. This uses `strict` mode so an undefined marker throws
 *      (fail‑fast), mirroring [`InputResolutionError`](./BFlowRun.InputResolver.ts).
 *
 *   2. **Pass 2 — Template strings** — Declarative Handlebars templates
 *      stored as constants (see [`BFlowRun.Prompt.Types`](./BFlowRun.Prompt.Types.ts))
 *      wrap the already‑interpolated prompt text. Uses `{{#if}}` / `{{#each}}`
 *      helpers for dynamic sections instead of imperative string concatenation.
 *      The pass‑1 output is fed verbatim into `step.prompts` / `job.prompt` /
 *      `pipeline.prompt`, so no `{{...}}` escaping collisions occur.
 *
 *   3. **Value resolution** — Input data (step, job, pipeline, variables,
 *      resolved inputs) is projected into a flat context object. Computed
 *      values are **hot‑swapped** directly into the context so the template
 *      receives the actual value, not a reference that needs a second pass.
 *
 * ## Hot‑swap semantics
 *
 * Resolved inputs and variables are flattened into the pass‑1 context keyed
 * by their logical names, so an author writing `{{topic}}` in a prompt gets
 * `"my-value"` substituted inline. Pass 2 still receives the original
 * `resolvedInputs` / `resolvedVariables` arrays (rendered as explicit
 * `name = value` blocks) so the AI has an unambiguous map of available data.
 *
 * ## Caveats
 *
 * Pass 1 only exposes the resolved input/variable map to the prompt strings —
 * not `step.name`, `job.name`, etc. A stray `{{step.name}}` inside a prompt
 * therefore renders to "step.name" reference error under strict mode. If an
 * input value itself contains `{{x}}` markers, those are left untouched by
 * pass 1 (the value is inserted as a finished string), and pass 2 cannot
 * re‑substitute them because {{step.prompts}} is emitted verbatim.
 */

import Handlebars from "handlebars";
import { resolveBFlowAIOption } from "../ai-config/BFlowHelixIntegration";
import type {
  BFlowPipelineEntity,
  BFlowPipelineVariable,
} from "../pipeline/BFlowPipeline.Types";
import type {
  BFlowWorkflowJob,
  BFlowStep,
} from "../workflow/BFlowWorkflow.Types";
import type { HelixAIOption } from "@/src/modules/helix";
import type { PipelineExecutionRequest } from "./BFlowRun.Actions";
import type { ResolvedStepInput } from "./BFlowRun.InputResolver";
import type { IBFlowRunPromptBuilder } from "./BFlowRun.Prompt.Types";
import {
  SYSTEM_PROMPT_TEMPLATE,
  USER_PROMPT_WITH_INPUTS_TEMPLATE,
  USER_PROMPT_SIMPLE_TEMPLATE,
} from "./BFlowRun.Prompt.Types";

// ─── Template Cache ───────────────────────────────────────────────────

/**
 * Simple in‑memory cache for compiled Handlebars templates.
 * Avoids re‑compiling the same template string on every invocation.
 */
const templateCache = new Map<string, HandlebarsTemplateDelegate>();

function compileCached(templateStr: string): HandlebarsTemplateDelegate {
  let compiled = templateCache.get(templateStr);
  if (!compiled) {
    compiled = Handlebars.compile(templateStr, { noEscape: true });
    templateCache.set(templateStr, compiled);
  }
  return compiled;
}

// ─── Pass 1: Inline Interpolation ────────────────────────────────────────

/**
 * Separate cache for pass‑1 prompt interpolation templates. These use
 * `strict: true` so referencing an unknown marker throws at render time,
 * surfacing typos like `{{tpoic}}` instead of silently rendering empty.
 */
const interpolationCache = new Map<string, HandlebarsTemplateDelegate>();

function compileInterpolation(templateStr: string): HandlebarsTemplateDelegate {
  let compiled = interpolationCache.get(templateStr);
  if (!compiled) {
    compiled = Handlebars.compile(templateStr, {
      noEscape: true,
      strict: true,
    });
    interpolationCache.set(templateStr, compiled);
  }
  return compiled;
}

/**
 * Flatten resolved inputs and pipeline variables into a single
 * `name → value` map that pass‑1 prompt interpolation can render against.
 *
 * Inputs and variables intentionally share the same namespace: in a prompt,
 * `{{topic}}` resolves to `vars.topic` **unless** an input named `topic`
 * overrides it (inputs take precedence because step‑scoped data is more
 * specific than pipeline‑scoped variables).
 */
function buildInterpolationContext(
  resolvedVariables?: BFlowPipelineVariable[],
  resolvedInputs?: ResolvedStepInput[],
): Record<string, string> {
  const ctx: Record<string, string> = {};

  // Variables first (lower precedence)
  if (resolvedVariables) {
    for (const v of resolvedVariables) {
      ctx[v.name] = v.value;
    }
  }

  // Inputs override variables (step scope beats pipeline scope)
  if (resolvedInputs) {
    for (const input of resolvedInputs) {
      ctx[input.name] = input.value;
    }
  }

  return ctx;
}

/**
 * Render a free‑form prompt string through pass‑1 Handlebars interpolation,
 * substituting `{{marker}}` references with the values in `context`.
 *
 * Falls back to the original string if it contains no interpolation
 * markers at all — avoids the cost of compiling trivial prompts and keeps
 * output byte‑identical to the input for marker‑free text.
 *
 * @param strict  When `true` (default), a marker referencing a name absent
 *                from `context` throws — mirroring the fail‑fast
 *                [`InputResolutionError`](./BFlowRun.InputResolver.ts) philosophy.
 *                When `false`, unresolvable markers are left untouched (the
 *                original string is returned) — used by pre‑resolution
 *                snapshots such as [`buildExecutionRequest`](#buildExecutionRequest)
 *                where cross‑step inputs are not yet available.
 */
function interpolatePrompt(
  promptStr: string,
  context: Record<string, string>,
  strict = true,
): string {
  // Quick reject: no double‑curly markers → nothing to interpolate.
  if (!promptStr.includes("{{")) {
    return promptStr;
  }

  const template = compileInterpolation(promptStr);
  try {
    return template(context);
  } catch (err) {
    if (!strict) {
      // Lenient mode (pre‑resolution snapshot): leave the prompt literal.
      return promptStr;
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Prompt interpolation failed.\n` +
        `    Prompt: ${promptStr.slice(0, 120)}${promptStr.length > 120 ? "…" : ""}\n` +
        `    Error:  ${msg}\n` +
        `    Available markers: ${Object.keys(context).join(", ") || "(none)"}`,
    );
  }
}

// ─── Context Builder Helpers ──────────────────────────────────────────

/**
 * Shape of the context object passed to the system prompt Handlebars template.
 */
interface SystemPromptContext {
  step: {
    name: string;
    prompts: string;
    output: Array<{ name: string; type: string }>;
  };
  job: {
    name: string;
    prompt: string;
  };
  pipeline: {
    prompt: string;
  };
  resolvedInputs: Array<{ name: string; value: string }>;
  resolvedVariables: Array<{ name: string; value: string }>;
}

/**
 * Build the template context for a system prompt.
 *
 * "Hot‑swap" principle: all computed values (resolved inputs, variables)
 * are flattened into the context by their logical names so the template
 * sees actual values, not reference chains.
 */
function buildSystemContext(
  step: BFlowStep,
  job: BFlowWorkflowJob,
  pipeline: BFlowPipelineEntity,
  resolvedVariables: BFlowPipelineVariable[],
  resolvedInputs?: ResolvedStepInput[],
  /**
   * Pass‑1 interpolation strictness. `true` (default) throws on unresolved
   * markers; `false` leaves the prompt literal when a marker can't be found.
   * Pre‑resolution snapshots (e.g. [`buildExecutionRequest`](#buildExecutionRequest))
   * pass `false` because cross‑step inputs aren't available yet.
   */
  strict = true,
): SystemPromptContext {
  // Flatten inputs + variables into the pass‑1 interpolation namespace.
  // Inputs take precedence over variables (step scope beats pipeline scope).
  const interpolationCtx = buildInterpolationContext(
    resolvedVariables,
    resolvedInputs,
  );

  // Pass 1: render each prompt string's `{{marker}}` markers inline.
  let interpolatedPrompts: string;
  if (Array.isArray(step.prompts)) {
    interpolatedPrompts = step.prompts
      .map((p) => interpolatePrompt(p, interpolationCtx, strict))
      .join("\n");
  } else if (typeof step.prompts === "string") {
    interpolatedPrompts = interpolatePrompt(
      step.prompts,
      interpolationCtx,
      strict,
    );
  } else {
    interpolatedPrompts = "";
  }

  const interpolatedJobPrompt = interpolatePrompt(
    job.prompt ?? "",
    interpolationCtx,
    strict,
  );
  const interpolatedPipelinePrompt = interpolatePrompt(
    pipeline.prompt ?? "",
    interpolationCtx,
    strict,
  );

  return {
    step: {
      name: step.name,
      prompts: interpolatedPrompts,
      output: step.output ?? [],
    },
    job: {
      name: job.name,
      prompt: interpolatedJobPrompt,
    },
    pipeline: {
      prompt: interpolatedPipelinePrompt,
    },
    resolvedInputs: (resolvedInputs ?? []).map((ri) => ({
      name: ri.name,
      value: ri.value,
    })),
    resolvedVariables: resolvedVariables.map((v) => ({
      name: v.name,
      value: v.value,
    })),
  };
}

/**
 * Shape of the context object passed to the user prompt Handlebars template.
 */
interface UserPromptContext {
  step: {
    name: string;
  };
  resolvedInputs: Array<{ name: string; value: string }>;
}

/**
 * Build the template context for a user prompt.
 */
function buildUserContext(
  step: BFlowStep,
  resolvedInputs?: ResolvedStepInput[],
): UserPromptContext {
  return {
    step: {
      name: step.name,
    },
    resolvedInputs: (resolvedInputs ?? []).map((ri) => ({
      name: ri.name,
      value: ri.value,
    })),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// BFlowRunPromptTemplateBar
// ═══════════════════════════════════════════════════════════════════════

/**
 * Handlebars‑based prompt builder that implements IBFlowRunPromptBuilder.
 *
 * ## Usage
 *
 * ```ts
 * const builder = new BFlowRunPromptTemplateBar();
 * const systemPrompt = builder.buildSystemPrompt(step, job, pipeline, vars, inputs);
 * ```
 *
 * ## Extending templates
 *
 * The Handlebars template strings are exported from `BFlowRun.Prompt.Types`
 * as `SYSTEM_PROMPT_TEMPLATE`, `USER_PROMPT_WITH_INPUTS_TEMPLATE`, and
 * `USER_PROMPT_SIMPLE_TEMPLATE`. You can override them by providing custom
 * template strings to the constructor:
 *
 * ```ts
 * const builder = new BFlowRunPromptTemplateBar({
 *   systemTemplate: `Custom {{step.name}} template...`,
 * });
 * ```
 */
export class BFlowRunPromptTemplateBar implements IBFlowRunPromptBuilder {
  private readonly systemTemplate: string;
  private readonly userWithInputsTemplate: string;
  private readonly userSimpleTemplate: string;

  constructor(options?: {
    systemTemplate?: string;
    userWithInputsTemplate?: string;
    userSimpleTemplate?: string;
  }) {
    this.systemTemplate = options?.systemTemplate ?? SYSTEM_PROMPT_TEMPLATE;
    this.userWithInputsTemplate =
      options?.userWithInputsTemplate ?? USER_PROMPT_WITH_INPUTS_TEMPLATE;
    this.userSimpleTemplate =
      options?.userSimpleTemplate ?? USER_PROMPT_SIMPLE_TEMPLATE;
  }

  // ─── System Prompt ──────────────────────────────────────────────────

  buildSystemPrompt(
    step: BFlowStep,
    job: BFlowWorkflowJob,
    pipeline: BFlowPipelineEntity,
    resolvedVariables: BFlowPipelineVariable[],
    resolvedInputs?: ResolvedStepInput[],
  ): string {
    // Per‑step path: fail‑fast if a `{{marker}}` can't be resolved.
    const context = buildSystemContext(
      step,
      job,
      pipeline,
      resolvedVariables,
      resolvedInputs,
      /* strict */ true,
    );
    const template = compileCached(this.systemTemplate);
    return template(context);
  }

  // ─── User Prompt ────────────────────────────────────────────────────

  buildUserPrompt(
    step: BFlowStep,
    resolvedInputs?: ResolvedStepInput[],
  ): string {
    const context = buildUserContext(step, resolvedInputs);

    const hasInputs = resolvedInputs !== undefined && resolvedInputs.length > 0;
    const templateStr = hasInputs
      ? this.userWithInputsTemplate
      : this.userSimpleTemplate;

    const template = compileCached(templateStr);
    return template(context);
  }

  // ─── Step System Prompt ─────────────────────────────────────────────

  buildStepSystemPrompt(
    step: BFlowStep,
    job: BFlowWorkflowJob,
    pipeline: BFlowPipelineEntity,
    resolvedVariables: BFlowPipelineVariable[],
    resolvedInputs?: ResolvedStepInput[],
  ): string {
    return this.buildSystemPrompt(
      step,
      job,
      pipeline,
      resolvedVariables,
      resolvedInputs,
    );
  }

  // ─── AI Config Resolution ──────────────────────────────────────────

  async resolveAIConfig(
    pipeline: BFlowPipelineEntity,
  ): Promise<HelixAIOption | undefined> {
    return resolveBFlowAIOption({
      pipelineId: pipeline.id,
      flowId: pipeline.flowId,
    });
  }

  // ─── Execution Request ──────────────────────────────────────────────

  buildExecutionRequest(
    runId: string,
    pipeline: BFlowPipelineEntity,
    jobs: BFlowWorkflowJob[],
    resolvedVariables: BFlowPipelineVariable[],
    aiConfig: HelixAIOption | undefined,
  ): PipelineExecutionRequest {
    return {
      runId,
      aiConfig,
      jobs: jobs.map((job) => ({
        jobId: job.id!,
        jobName: job.name,
        steps: job.steps.map((step) => {
          // Pre‑resolution snapshot: cross‑step inputs aren't available yet,
          // so pass `strict=false` to leave unresolvable `{{marker}}` markers
          // as literal text. Actual per‑step execution re‑invokes
          // [`buildStepSystemPrompt`](#buildStepSystemPrompt) with resolved
          // inputs, where strict mode fails fast on genuine typos.
          const snapshotContext = buildSystemContext(
            step,
            job,
            pipeline,
            resolvedVariables,
            undefined,
            /* strict */ false,
          );
          return {
            stepId: step.id!,
            stepName: step.name,
            systemPrompt: compileCached(this.systemTemplate)(snapshotContext),
            userPrompt: this.buildUserPrompt(step),
            aiConfig,
          };
        }),
      })),
    };
  }
}
