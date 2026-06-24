/**
 * BFlowRun.Prompt.Types — Interfaces and types for BunnyFlow prompt builders.
 *
 * Defines the contract that every prompt builder must implement, enabling
 * interchangeable strategies (e.g. section-based, template‑driven via Handlebars).
 */

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

// ─── Prompt Builder Interface ──────────────────────────────────────────

/**
 * Contract for all BunnyFlow prompt builders.
 *
 * Implementations can use different strategies internally (string concatenation,
 * fluent section builder, Handlebars templates, etc.) as long as they conform
 * to this interface.
 */
export interface IBFlowRunPromptBuilder {
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
  ): string;

  /**
   * Build the user prompt for a single step, optionally including
   * resolved input context.
   */
  buildUserPrompt(
    step: BFlowStep,
    resolvedInputs?: ResolvedStepInput[],
  ): string;

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
  ): string;

  /**
   * Resolve the effective AI config (provider + model) from IndexedDB
   * using the BunnyFlow hierarchical config resolver.
   */
  resolveAIConfig(
    pipeline: BFlowPipelineEntity,
  ): Promise<HelixAIOption | undefined>;

  /**
   * Build a full PipelineExecutionRequest from the pipeline, its jobs,
   * and the resolved variables. Constructs system/user prompts for every
   * step using the builder's own methods.
   */
  buildExecutionRequest(
    runId: string,
    pipeline: BFlowPipelineEntity,
    jobs: BFlowWorkflowJob[],
    resolvedVariables: BFlowPipelineVariable[],
    aiConfig: HelixAIOption | undefined,
  ): PipelineExecutionRequest;
}

// ─── Prompt Builder Strategy ──────────────────────────────────────────

/**
 * Enum of available prompt builder strategies.
 * Used to select which builder implementation to use at runtime.
 */
export enum BFlowPromptBuilderKind {
  /** Fluent section‑based builder (default) */
  Section = "section",
  /** Handlebars template‑driven builder (TemplateBar) */
  TemplateBar = "templatebar",
}

// ─── Template Strings (for Handlebars‑based builders) ──────────────────

/**
 * Handlebar template strings used by the TemplateBar prompt builder.
 *
 * Each template is a standalone Handlebars template that uses `{{#if}}` and
 * `{{#each}}` helpers for dynamic section rendering instead of imperative
 * string concatenation. This makes the prompt structure fully declarative
 * and easy to audit or customise.
 */

/** System prompt template — the complete instruction block sent to the AI. */
export const SYSTEM_PROMPT_TEMPLATE = `You are executing step "{{step.name}}" in job "{{job.name}}" of a pipeline.
{{#if step.prompts}}
Instructions: {{step.prompts}}
{{/if}}
{{#if job.prompt}}
Job Context: {{job.prompt}}
{{/if}}
{{#if pipeline.prompt}}
Pipeline Context: {{pipeline.prompt}}
{{/if}}
{{#if resolvedInputs.length}}
Resolved Inputs:
{{#each resolvedInputs}}
  {{this.name}} = {{this.value}}
{{/each}}
{{/if}}
{{#if resolvedVariables.length}}
Available variables:
{{#each resolvedVariables}}
  {{this.name}} = {{this.value}}
{{/each}}
{{/if}}
{{#if step.output.length}}
You MUST return your response as a valid JSON object with the following fields:
{
{{#each step.output}}
  "{{this.name}}": <{{this.type}}>
{{/each}}
}
Do NOT include any text outside the JSON object. Do NOT wrap it in markdown code blocks. Return ONLY the raw JSON object.
{{/if}}`;

/** User prompt template (with inputs). */
export const USER_PROMPT_WITH_INPUTS_TEMPLATE = `Execute step "{{step.name}}" with the following inputs:
{{#each resolvedInputs}}
  {{this.name}}: {{this.value}}
{{/each}}

Provide the output for this step.`;

/** User prompt template (without inputs). */
export const USER_PROMPT_SIMPLE_TEMPLATE = `Execute step "{{step.name}}" and provide the output.`;
