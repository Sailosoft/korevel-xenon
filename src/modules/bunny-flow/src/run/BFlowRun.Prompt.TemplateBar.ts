/**
 * BFlowRun.Prompt.TemplateBar — Handlebars‑driven prompt builder.
 *
 * Implements IBFlowRunPromptBuilder using Handlebars template compilation.
 * Separates concerns into three distinct phases:
 *
 *   1. **Template strings** — Declarative Handlebars templates stored as
 *      constants (see [`BFlowRun.Prompt.Types`](./BFlowRun.Prompt.Types.ts)).
 *      Uses `{{#if}}` / `{{#each}}` helpers for dynamic sections instead of
 *      imperative string concatenation.
 *
 *   2. **Value resolution** — Input data (step, job, pipeline, variables,
 *      resolved inputs) is projected into a flat context object. Computed
 *      values are **hot‑swapped** directly into the context so the template
 *      receives the actual value, not a reference that needs a second pass.
 *
 *   3. **Template compilation** — Handlebars compiles the template string
 *      once (cached per unique template) and renders it against the context.
 *
 * ## Hot‑swap semantics
 *
 * Instead of inserting `{{input.someField}}` placeholders that require a
 * secondary resolution step, the TemplateBar builder resolves all inputs
 * and variables ahead of time and places the **computed value** directly
 * into the template context keyed by its logical name. This means the
 * Handlebars template sees `{{slug}}` already containing `"my-value"`
 * rather than `{{input.slug}}` that would need a later substitution pass.
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
): SystemPromptContext {
  return {
    step: {
      name: step.name,
      prompts:
        step.prompts && Array.isArray(step.prompts)
          ? step.prompts.join("\n")
          : (step.prompts ?? ""),
      output: step.output ?? [],
    },
    job: {
      name: job.name,
      prompt: job.prompt ?? "",
    },
    pipeline: {
      prompt: pipeline.prompt ?? "",
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
    const context = buildSystemContext(
      step,
      job,
      pipeline,
      resolvedVariables,
      resolvedInputs,
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
        steps: job.steps.map((step) => ({
          stepId: step.id!,
          stepName: step.name,
          systemPrompt: this.buildSystemPrompt(
            step,
            job,
            pipeline,
            resolvedVariables,
          ),
          userPrompt: this.buildUserPrompt(step),
          aiConfig,
        })),
      })),
    };
  }
}
