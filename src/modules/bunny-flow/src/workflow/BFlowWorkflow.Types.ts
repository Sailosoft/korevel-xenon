import { z } from "zod";

// ─── Shared Primitives ─────────────────────────────────────────────

/** Slug identifier pattern */
const SlugSchema = z.string().min(1, "Slug must not be empty").max(128);

/** GUIDv7 identifier */
const GuidSchema = z.string().min(1, "GUID is required");

/** Name constraint */
const NameSchema = z.string().min(1, "Name must not be empty").max(256);

// ─── Variable ──────────────────────────────────────────────────────

export const BFlowVariableTypeSchema = z.enum([
  "text",
  "number",
  "boolean",
  "select",
  "textarea",
]);
export type BFlowVariableType = z.infer<typeof BFlowVariableTypeSchema>;

export const BFlowVariableSchema = z.object({
  id: GuidSchema.optional(),
  name: NameSchema,
  defaultValue: z.string(),
  type: BFlowVariableTypeSchema,
  description: z.string().optional(),
});
export type BFlowVariable = z.infer<typeof BFlowVariableSchema>;

// ─── Step Skip Condition ──────────────────────────────────────────

export const BFlowStepConditionSchema = z.enum([
  "==",
  "!=",
  ">",
  "<",
  ">=",
  "<=",
]);
export type BFlowStepCondition = z.infer<typeof BFlowStepConditionSchema>;

export const BFlowStepSkipIfSchema = z.object({
  inputs: z.string(),
  condition: BFlowStepConditionSchema,
  value: z.union([z.string(), z.number(), z.boolean()]),
});
export type BFlowStepSkipIf = z.infer<typeof BFlowStepSkipIfSchema>;

// ─── Step Input ────────────────────────────────────────────────────

export const BFlowStepInputSchema = z.object({
  id: GuidSchema.optional(),
  name: NameSchema,
  /**
   * inputs:
   *   - name: slug
   *     source: {job}.{step}.outputs.{name}
   *   - name: slug-1
   *     source: vars.{name}
   */
  source: z.string(),
});
export type BFlowStepInput = z.infer<typeof BFlowStepInputSchema>;

// ─── Step Output ───────────────────────────────────────────────────

export const BFlowStepOutputTypeSchema = z.enum([
  "plain",
  "markdown",
  "json",
  "html",
  "csv",
  "json_array",
  "yaml",
]);
export type BFlowStepOutputType = z.infer<typeof BFlowStepOutputTypeSchema>;

export const BFlowStepOutputModeSchema = z.object({
  name: NameSchema,
  type: BFlowStepOutputTypeSchema,
});
export type BFlowStepOutputMode = z.infer<typeof BFlowStepOutputModeSchema>;

// ─── Step ──────────────────────────────────────────────────────────

export const BFlowStepSchema = z.object({
  id: GuidSchema.optional(),
  /** name of step */
  name: NameSchema,
  skipIf: z.array(BFlowStepSkipIfSchema).optional(),
  inputs: z.array(BFlowStepInputSchema).optional(),
  /**
   * agent name reference:
   * - agentpool.{name}.{agent_name}
   * - agent.{name}
   */
  prompts: z.union([z.string(), z.array(z.string())]),
  agent: z.string().optional(),
  /** Define output format. If not defined, defaults to plain output without commentary */
  output: z.array(BFlowStepOutputModeSchema).optional(),
});
export type BFlowStep = z.infer<typeof BFlowStepSchema>;

// ─── Job ───────────────────────────────────────────────────────────

export const BFlowWorkflowJobSchema = z.object({
  /** guid */
  id: GuidSchema.optional(),
  /** Jobs avoid spaces */
  name: NameSchema,
  /** agent slug */
  agent: z.string().optional(),
  /** Reference to another job slug */
  needs: z.union([z.string(), z.array(z.string())]).optional(),
  /** Variables specific to this job */
  variables: z.array(BFlowVariableSchema).optional(),
  /** Prompt */
  prompt: z.string(),
  steps: z.array(BFlowStepSchema),
});
export type BFlowWorkflowJob = z.infer<typeof BFlowWorkflowJobSchema>;

// ─── Workflow Agent ────────────────────────────────────────────────

export const BFlowWorkflowAgentSchema = z.object({
  id: GuidSchema.optional(),
  name: NameSchema,
  slug: SlugSchema,
  role: z.string(),
  prompt: z.string(),
});
export type BFlowWorkflowAgent = z.infer<typeof BFlowWorkflowAgentSchema>;

// ─── Workflow (YAML Records Structure) ─────────────────────────────

export const BFlowWorkflowSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  /** semantic version of workflow e.g. 1.0.0 */
  semanticVersion: z.string(),
  /** Variables that will be used in workflow */
  variables: z.array(BFlowVariableSchema),
  /** Agent pool slugs injected from flow */
  agentPools: z.array(z.string()),
  /** Agents setup inside workflow */
  agents: z.array(BFlowWorkflowAgentSchema),
  /** Jobs - Steps that will execute */
  jobs: z.array(BFlowWorkflowJobSchema),
});
export type BFlowWorkflow = z.infer<typeof BFlowWorkflowSchema>;
