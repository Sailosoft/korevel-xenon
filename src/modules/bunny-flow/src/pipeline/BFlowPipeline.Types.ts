import { z } from "zod";

// ─── Shared Primitives ─────────────────────────────────────────────

const GuidSchema = z.string().min(1);

// ─── Pipeline Variable ─────────────────────────────────────────────

export const BFlowPipelineVariableSchema = z.object({
  id: GuidSchema,
  name: z.string(),
  value: z.string(),
  type: z.enum(["text", "number", "boolean", "select", "textarea"]),
  description: z.string().optional(),
});
export type BFlowPipelineVariable = z.infer<typeof BFlowPipelineVariableSchema>;

// ─── Pipeline ──────────────────────────────────────────────────────

export const BFlowPipelineStatusSchema = z.enum([
  "running",
  "completed",
  "failed",
  "cancelled",
]);
export type BFlowPipelineStatus = z.infer<typeof BFlowPipelineStatusSchema>;

export const BFlowPipelineSchema = z.object({
  /** GUIDv7 */
  id: z.string(),
  version: z.number().int(),
  /** GUIDv7 reference to BFlowWorkflowTemplate */
  templateId: z.string(),
  /** Definition id */
  flowId: z.string(),
  /** Variable reference to variable management group */
  variableGroupId: z.string(),
  /** Variables for the job in pipeline. Overrides the group variable */
  variables: z.array(BFlowPipelineVariableSchema),
  /** Optional prompt that will override the template prompt */
  prompt: z.string().optional(),
  /** Name of the pipeline */
  name: z.string().min(1),
  /** Slug */
  slug: z.string().min(1),
  /** Description of the pipeline */
  description: z.string().optional(),
  /** Version of the pipeline */
  versionLabel: z.string().optional(),
  /** Status of the pipeline */
  status: BFlowPipelineStatusSchema.optional().default("running"),
  /** Metadata of the pipeline */
  metadata: z.record(z.string(), z.unknown()).optional(),
  /** Created timestamp */
  createdAt: z.date(),
  /** Updated timestamp */
  updatedAt: z.date(),
});
export type BFlowPipelineEntity = z.infer<typeof BFlowPipelineSchema>;

// ─── Pipeline Variables (Computed/Transient) ───────────────────────

/**
 * Temporary and Computed Value for pipeline execution variable.
 * These variables will not be saved to the database and will be discarded after the pipeline is completed.
 */
export const BFlowPipelineVariablesSchema = z.object({
  /** Reference from computed before pipeline execution and workflow variable default value */
  persistent: z.array(BFlowPipelineVariableSchema),
  /** Changed and computed property for job */
  job: z.array(BFlowPipelineVariableSchema),
  /** Computed from step execution. Gets the value for job */
  step: z.array(BFlowPipelineVariableSchema),
});
export type BFlowPipelineVariables = z.infer<
  typeof BFlowPipelineVariablesSchema
>;

// ─── Pipeline Store ────────────────────────────────────────────────

/**
 * The purpose of this is when the pipeline is running, each step output will be stored here.
 * So it could be referenced from other steps via input source.
 */
export const BFlowPipelineStoreSchema = z.object({
  id: z.string(),
  /** Reference to BFlowPipeline */
  pipelineId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type BFlowPipelineStoreEntity = z.infer<typeof BFlowPipelineStoreSchema>;

export const BFlowPipelineStoreDataSchema = z.object({
  id: z.string(),
  /** Reference to BFlowPipelineStore */
  storeId: z.string(),
  key: z.string(),
  value: z.any(),
});
export type BFlowPipelineStoreDataEntity = z.infer<
  typeof BFlowPipelineStoreDataSchema
>;

// ─── Form Schema (user-editable fields only) ─────────────────────────

/**
 * Form schema for creating/updating a pipeline.
 * Excludes auto-generated fields: `id`, `version`, `createdAt`, `updatedAt`.
 */
export const BFlowPipelineFormSchema = z.object({
  templateId: z.string().min(1, "Workflow template is required"),
  flowId: z.string().min(1, "Flow definition is required"),
  variableGroupId: z.string().min(1, "Variable group is required"),
  name: z.string().min(1, "Name must not be empty").max(256),
  slug: z.string().min(1, "Slug must not be empty").max(128),
  description: z.string().optional(),
  prompt: z.string().optional(),
  versionLabel: z.string().optional(),
  status: BFlowPipelineStatusSchema.optional().default("running"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type BFlowPipelineForm = z.infer<typeof BFlowPipelineFormSchema>;
