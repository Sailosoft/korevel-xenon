/**
 * BFlowRun.SectionBuilder — Fluent section‑based prompt builder.
 *
 * Implements IBFlowRunPromptBuilder using the BFlowPromptSectionBuilder fluent
 * internal helper. Sections are pushed individually and joined at the end.
 */

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

// ─── Fluent Prompt Section Builder ───────────────────────────────────

/**
 * A small fluent builder that accumulates prompt sections as strings.
 * Each method appends one logical section and returns the builder for chaining:
 *
 *   builder
 *     .instructions(step)
 *     .jobContext(job)
 *     .resolveInput(input)        // ← per-input push
 *     .availableVariables(vars)
 *     .outputFormat(step)
 *     .build();
 */
class BFlowPromptSectionBuilder {
  private readonly parts: string[] = [];

  /** Adds a raw string section. */
  add(section: string): this {
    this.parts.push(section);
    return this;
  }

  /** Step instructions block. */
  instructions(step: BFlowStep): this {
    if (step.prompts) {
      const text = Array.isArray(step.prompts)
        ? step.prompts.join("\n")
        : step.prompts;
      return this.add(`\nInstructions: ${text}`);
    }
    return this;
  }

  /** Job-level context block. */
  jobContext(job: BFlowWorkflowJob): this {
    return job.prompt ? this.add(`\nJob Context: ${job.prompt}`) : this;
  }

  /** Pipeline-level context block. */
  pipelineContext(pipeline: BFlowPipelineEntity): this {
    return pipeline.prompt
      ? this.add(`\nPipeline Context: ${pipeline.prompt}`)
      : this;
  }

  /**
   * Resolve a single step input and render it to the "Resolved Inputs"
   * section. This replaces the old monolithic `parts.push("Resolved Inputs"…)`
   * block — callers push inputs one at a time via `builder.resolveInput(ri)`.
   *
   * The input is appended to an open "Resolved Inputs" group; the group's
   * header is written lazily when the first input is pushed.
   */
  resolveInput(input: ResolvedStepInput): this {
    return this.resolveInputs([input]);
  }

  /**
   * Resolve several step inputs at once, rendering them under a single
   * "Resolved Inputs" header.
   */
  resolveInputs(inputs: ResolvedStepInput[] | undefined): this {
    if (inputs && inputs.length > 0) {
      return this.add(
        `\nResolved Inputs:\n${inputs
          .map((ri) => `  ${ri.name} = ${ri.value}`)
          .join("\n")}`,
      );
    }
    return this;
  }

  /** "Available variables" block. */
  availableVariables(variables: BFlowPipelineVariable[]): this {
    if (variables.length > 0) {
      return this.add(
        `\nAvailable variables:\n${variables
          .map((v) => `  ${v.name} = ${v.value}`)
          .join("\n")}`,
      );
    }
    return this;
  }

  /** Output-format (structured-JSON) instructions for steps that declare outputs. */
  outputFormat(step: BFlowStep): this {
    if (step.output && step.output.length > 0) {
      const fields = step.output
        .map((od) => `  "${od.name}": <${od.type}>`)
        .join("\n");
      return this.add(
        `\n\nYou MUST return your response as a valid JSON object with the following fields:\n` +
          `{\n${fields}\n}\n` +
          `Do NOT include any text outside the JSON object. Do NOT wrap it in markdown code blocks. ` +
          `Return ONLY the raw JSON object.`,
      );
    }
    return this;
  }

  /** Join all accumulated sections into the final prompt string. */
  build(): string {
    return this.parts.join("\n");
  }
}

export class BFlowRunPromptBuilder implements IBFlowRunPromptBuilder {
  /**
   * Build the system prompt for a single step using the fluent section
   * builder. Sections are pushed via `builder.resolveInput(...)`,
   * `builder.instructions(...)`, etc., instead of bare `parts.push(...)`.
   */
  buildSystemPrompt(
    step: BFlowStep,
    job: BFlowWorkflowJob,
    pipeline: BFlowPipelineEntity,
    resolvedVariables: BFlowPipelineVariable[],
    resolvedInputs?: ResolvedStepInput[],
  ): string {
    const builder = new BFlowPromptSectionBuilder();

    builder.add(
      `You are executing step "${step.name}" in job "${job.name}" of a pipeline.`,
    );

    if (resolvedInputs && resolvedInputs.length > 0) {
      // Push each resolved input individually — the per-item API requested
      // (`builder.resolveInput(your input)`).
      for (const ri of resolvedInputs) {
        builder.resolveInput(ri);
      }
    }

    builder
      .instructions(step)
      .jobContext(job)
      .pipelineContext(pipeline)
      .availableVariables(resolvedVariables)
      .outputFormat(step);

    return builder.build();
  }

  /**
   * Build the user prompt for a single step, optionally including
   * resolved input context.
   */
  buildUserPrompt(
    step: BFlowStep,
    resolvedInputs?: ResolvedStepInput[],
  ): string {
    if (resolvedInputs && resolvedInputs.length > 0) {
      return (
        `Execute step "${step.name}" with the following inputs:\n` +
        resolvedInputs.map((ri) => `  ${ri.name}: ${ri.value}`).join("\n") +
        `\n\nProvide the output for this step.`
      );
    }
    return `Execute step "${step.name}" and provide the output.`;
  }

  /**
   * Resolve the effective AI config (provider + model) from IndexedDB
   * using the BunnyFlow hierarchical config resolver.
   */
  async resolveAIConfig(
    pipeline: BFlowPipelineEntity,
  ): Promise<HelixAIOption | undefined> {
    return resolveBFlowAIOption({
      pipelineId: pipeline.id,
      flowId: pipeline.flowId,
    });
  }

  /**
   * Build a system prompt for a single step with its resolved inputs.
   * This is used during per-step execution (step-by-step pipeline run).
   */
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

  /**
   * Build a full PipelineExecutionRequest from the pipeline, its jobs,
   * and the resolved variables. Constructs system/user prompts for every
   * step using the builder's own methods.
   *
   * NOTE: This batch method does NOT include resolved inputs since they
   * depend on runtime step output resolution. For steps with input sources,
   * use per-step execution via `buildStepSystemPrompt` / `buildStepUserPrompt`.
   */
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
