import { z } from "zod";
import { BFlowPipelineVariableSchema } from "../pipeline/BFlowPipeline.Types";

// ─── Shared Primitives ─────────────────────────────────────────────

const GuidSchema = z.string().min(1);

// ─── Run Status ────────────────────────────────────────────────────

export const BFlowRunStatusSchema = z.enum([
  "pending",
  "running",
  "succeeded",
  "failed",
  "cancelled",
  "skipped",
]);
export type BFlowRunStatus = z.infer<typeof BFlowRunStatusSchema>;

// ─── Step Run ──────────────────────────────────────────────────────

/**
 * Tracks the execution state of a single step within a job.
 * Captures start/end timestamps, output, errors, and computed variables.
 */
export const BFlowStepRunSchema = z.object({
  /** GUIDv7 */
  id: z.string(),
  /** Reference to BFlowJobRun */
  jobRunId: z.string(),
  /** Reference to BFlowPipelineRun */
  runId: z.string(),
  /** The step id from the workflow template */
  stepId: z.string(),
  /** The step name from the workflow template */
  stepName: z.string(),
  /** Current status of this step execution */
  status: BFlowRunStatusSchema,
  /** The agent used for this step */
  agent: z.string().optional(),
  /** The prompt(s) used for this step */
  prompts: z.union([z.string(), z.array(z.string())]).optional(),
  /** The AI provider used */
  aiProvider: z.string().optional(),
  /** The AI model used */
  aiModel: z.string().optional(),
  /** Computed variables for this step (resolved from inputs) */
  computedVariables: z.array(BFlowPipelineVariableSchema).optional().default([]),
  /** The resolved input values for this step */
  resolvedInputs: z.record(z.string(), z.unknown()).optional().default({}),
  /** The final resolved system prompt sent to the AI (with all variables and inputs substituted) */
  resolvedSystemPrompt: z.string().optional(),
  /** The final resolved user prompt sent to the AI (with all variables and inputs substituted) */
  resolvedUserPrompt: z.string().optional(),
  /** The raw output from AI execution */
  output: z.string().optional(),
  /** Structured output if defined */
  structuredOutput: z.record(z.string(), z.unknown()).optional(),
  /** Error message if step failed */
  error: z.string().optional(),
  /** Timestamp when step execution started */
  startedAt: z.date().optional(),
  /** Timestamp when step execution completed */
  completedAt: z.date().optional(),
  /** Created timestamp */
  createdAt: z.date(),
  /** Updated timestamp */
  updatedAt: z.date(),
});
export type BFlowStepRun = z.infer<typeof BFlowStepRunSchema>;

// ─── Job Run ───────────────────────────────────────────────────────

/**
 * Tracks the execution state of a single job within a pipeline run.
 * A job contains multiple steps that execute sequentially.
 */
export const BFlowJobRunSchema = z.object({
  /** GUIDv7 */
  id: z.string(),
  /** Reference to BFlowPipelineRun */
  runId: z.string(),
  /** The job id from the workflow template */
  jobId: z.string(),
  /** The job name from the workflow template */
  jobName: z.string(),
  /** Current status of this job execution */
  status: BFlowRunStatusSchema,
  /** Job-level prompt override */
  prompt: z.string().optional(),
  /** Job needs/dependencies references */
  needs: z.union([z.string(), z.array(z.string())]).optional(),
  /** Snapshot of variables at job start time */
  variablesSnapshot: z
    .array(BFlowPipelineVariableSchema)
    .optional()
    .default([]),
  /** The agent used for this job */
  agent: z.string().optional(),
  /** The AI provider used for this job */
  aiProvider: z.string().optional(),
  /** The AI model used for this job */
  aiModel: z.string().optional(),
  /** Error message if job failed */
  error: z.string().optional(),
  /** The index order of this job (for display) */
  order: z.number().int(),
  /** Timestamp when job execution started */
  startedAt: z.date().optional(),
  /** Timestamp when job execution completed */
  completedAt: z.date().optional(),
  /** Created timestamp */
  createdAt: z.date(),
  /** Updated timestamp */
  updatedAt: z.date(),
});
export type BFlowJobRun = z.infer<typeof BFlowJobRunSchema>;

// ─── Pipeline Run ──────────────────────────────────────────────────

/**
 * Tracks the overall execution of a pipeline.
 * Contains references to the pipeline, its template, variable group, and all job/step runs.
 */
export const BFlowPipelineRunSchema = z.object({
  /** GUIDv7 */
  id: z.string(),
  /** Reference to BFlowPipeline */
  pipelineId: z.string(),
  /** Reference to BFlowDefinition (flow) */
  flowId: z.string(),
  /** Reference to BFlowWorkflowTemplate */
  templateId: z.string(),
  /** Reference to BFlowVariableGroup */
  variableGroupId: z.string(),
  /** Current overall status of this pipeline run */
  status: BFlowRunStatusSchema,
  /** The prompt override used for this run */
  prompt: z.string().optional(),
  /** Snapshot of pipeline variables at run start */
  variablesSnapshot: z
    .array(BFlowPipelineVariableSchema)
    .optional()
    .default([]),
  /** Error message if the entire run failed */
  error: z.string().optional(),
  /** Run number (incremental) */
  runNumber: z.number().int().optional(),
  /** Timestamp when pipeline run started */
  startedAt: z.date().optional(),
  /** Timestamp when pipeline run completed */
  completedAt: z.date().optional(),
  /** Created timestamp */
  createdAt: z.date(),
  /** Updated timestamp */
  updatedAt: z.date(),
});
export type BFlowPipelineRunEntity = z.infer<typeof BFlowPipelineRunSchema>;

// ─── Summary View ──────────────────────────────────────────────────

/**
 * A lightweight summary view of a pipeline run, used for listing runs
 * without loading all job/step details.
 */
export const BFlowPipelineRunSummarySchema = z.object({
  id: z.string(),
  pipelineId: z.string(),
  pipelineName: z.string(),
  flowId: z.string(),
  templateId: z.string(),
  status: BFlowRunStatusSchema,
  runNumber: z.number().int().optional(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  createdAt: z.date(),
});
export type BFlowPipelineRunSummary = z.infer<
  typeof BFlowPipelineRunSummarySchema
>;
