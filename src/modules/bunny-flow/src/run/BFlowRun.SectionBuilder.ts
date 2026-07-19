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

  /** Output-format instructions for steps that declare outputs. */
  outputFormat(step: BFlowStep, defaultOutputType?: string): this {
    if (step.output && step.output.length > 0) {
      const fields = step.output
        .map((od) => {
          const type = od.type ?? defaultOutputType ?? "markdown";
          return `  "${od.name}": <${type}>`;
        })
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

  /**
   * Output type instruction — tells the AI what format the output should follow.
   * Appended when the step does NOT declare structured outputs but has an implicit output type.
   */
  outputTypeInstruction(outputType: string | undefined): this {
    const type = outputType ?? "markdown";
    if (type === "plain") {
      return this.add(
        `\n\nIMPORTANT: Your response MUST be plain text only. Do NOT use markdown formatting, ` +
          `headings, bold, italic, code blocks, lists, or any other markup. Return raw plain text.`,
      );
    }
    if (type === "html") {
      return this.add(
        `\n\nIMPORTANT: Your response MUST be valid HTML. Use proper HTML tags for structure ` +
          `(e.g. <h1>, <p>, <ul>, <li>, <code>). Do NOT wrap the output in markdown code fences.`,
      );
    }
    if (type === "json") {
      return this.add(
        `\n\nIMPORTANT: Your response MUST be a valid JSON object. Do NOT wrap it in markdown ` +
          `code blocks. Return ONLY the raw JSON object.`,
      );
    }
    if (type === "csv") {
      return this.add(
        `\n\nIMPORTANT: Your response MUST be valid CSV (comma-separated values) data ONLY. ` +
          `The first line MUST be a header row with column names. Each subsequent line MUST be ` +
          `a data row. Do NOT include any introductory text, explanations, or commentary. ` +
          `Do NOT wrap the output in markdown code blocks. Return ONLY the raw CSV data.`,
      );
    }
    if (type === "yaml") {
      return this.add(
        `\n\nIMPORTANT: Your response MUST be valid YAML ONLY. Use proper YAML syntax with ` +
          `correct indentation (2 spaces), key-value pairs, lists, and nested structures. ` +
          `Do NOT include any introductory text, explanations, or commentary. ` +
          `Do NOT wrap the output in markdown code blocks. Return ONLY the raw YAML content.`,
      );
    }
    // Default: markdown
    return this.add(
      `\n\nIMPORTANT: Format your response using markdown. Use headings, lists, code blocks, ` +
        `and other markdown elements as appropriate for readability.`,
    );
  }

  /** Join all accumulated sections into the final prompt string. */
  build(): string {
    return this.parts.join("\n");
  }
}

export class BFlowRunPromptBuilder implements IBFlowRunPromptBuilder {
  /**
   * Resolve the effective output type for a step.
   * Priority:
   *   1. step.outputType (when no structured outputs defined)
   *   2. fallback "markdown"
   *
   * When step has structured outputs (`step.output`), each output field
   * has its own type — handled in outputFormat().
   */
  private resolveStepOutputType(step: BFlowStep): string {
    return step.outputType ?? "markdown";
  }

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
    // Resolve step-level outputType (no longer workflow-level)
    const effectiveOutputType = this.resolveStepOutputType(step);

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
      .jobContext(job)
      .pipelineContext(pipeline)
      .availableVariables(resolvedVariables)
      .outputFormat(step, effectiveOutputType);

    // If step has no structured outputs, add output type instruction
    // using the step-level outputType (defaults to "markdown")
    if (!step.output || step.output.length === 0) {
      builder.outputTypeInstruction(effectiveOutputType);
    }

    return builder.build();
  }

  /**
   * Build the user prompt for a single step from the step's own prompts field
   * (the actual task), with {{varName}} template variables resolved.
   */
  buildUserPrompt(
    step: BFlowStep,
    resolvedInputs?: ResolvedStepInput[],
    resolvedVariables?: BFlowPipelineVariable[],
  ): string {
    // Use the step's own prompts as the user prompt (the actual task)
    const rawPrompts = Array.isArray(step.prompts)
      ? step.prompts.join("\n")
      : step.prompts;

    if (rawPrompts) {
      // Resolve {{varName}} template variables
      let resolved = rawPrompts;
      if (resolvedVariables) {
        for (const v of resolvedVariables) {
          resolved = resolved.replaceAll(`{{${v.name}}}`, v.value);
        }
      }
      console.log(
        "[BFlowRun.SectionBuilder] buildUserPrompt RESULT:",
        resolved,
      );
      return resolved;
    }

    // Fallback: generate a generic user prompt from inputs
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
