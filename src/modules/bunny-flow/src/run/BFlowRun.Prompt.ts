/**
 * BFlowRunPromptBuilder — Builds system/user prompts and pipeline execution requests.
 *
 * Encapsulates all prompt construction logic so the component stays focused
 * on orchestration and rendering, and prompting can be tested/evolved
 * independently.
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

export class BFlowRunPromptBuilder {
  /**
   * Build the system prompt for a single step, incorporating:
   * - Step name and instructions (prompts)
   * - Job-level context prompt
   * - Pipeline-level context prompt
   * - Resolved pipeline variables
   * - Resolved step inputs (from vars or other step outputs)
   */
  buildSystemPrompt(
    step: BFlowStep,
    job: BFlowWorkflowJob,
    pipeline: BFlowPipelineEntity,
    resolvedVariables: BFlowPipelineVariable[],
    resolvedInputs?: ResolvedStepInput[],
  ): string {
    const parts: string[] = [
      `You are executing step "${step.name}" in job "${job.name}" of a pipeline.`,
    ];

    if (step.prompts) {
      const instructions = Array.isArray(step.prompts)
        ? step.prompts.join("\n")
        : step.prompts;
      parts.push(`\nInstructions: ${instructions}`);
    }

    if (job.prompt) {
      parts.push(`\nJob Context: ${job.prompt}`);
    }
    if (pipeline.prompt) {
      parts.push(`\nPipeline Context: ${pipeline.prompt}`);
    }

    // ── Resolved Inputs ──────────────────────────────────────────
    if (resolvedInputs && resolvedInputs.length > 0) {
      parts.push(
        `\nResolved Inputs:\n${resolvedInputs
          .map((ri) => `  ${ri.name} = ${ri.value}`)
          .join("\n")}`,
      );
    }

    // ── Variables ────────────────────────────────────────────────
    if (resolvedVariables.length > 0) {
      parts.push(
        `\nAvailable variables:\n${resolvedVariables
          .map((v) => `  ${v.name} = ${v.value}`)
          .join("\n")}`,
      );
    }

    // ── Output Format Instructions ───────────────────────────────
    // If the step defines named outputs, tell the AI to return JSON
    // so we can parse and extract structured fields.
    if (step.output && step.output.length > 0) {
      const fields = step.output
        .map((od) => `  "${od.name}": <${od.type}>`)
        .join("\n");

      parts.push(
        `\n\nYou MUST return your response as a valid JSON object with the following fields:\n` +
        `{\n${fields}\n}\n` +
        `Do NOT include any text outside the JSON object. Do NOT wrap it in markdown code blocks. ` +
        `Return ONLY the raw JSON object.`,
      );
    }

    return parts.join("\n");
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
        resolvedInputs
          .map((ri) => `  ${ri.name}: ${ri.value}`)
          .join("\n") +
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
    return this.buildSystemPrompt(step, job, pipeline, resolvedVariables, resolvedInputs);
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
          systemPrompt: this.buildSystemPrompt(step, job, pipeline, resolvedVariables),
          userPrompt: this.buildUserPrompt(step),
          aiConfig,
        })),
      })),
    };
  }
}
