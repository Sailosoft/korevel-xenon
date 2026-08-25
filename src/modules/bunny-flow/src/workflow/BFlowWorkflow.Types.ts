import { z } from "zod";
import {
  BFlowVariableBaseSchema,
  BFlowVariableTypeSchema,
} from "../shared/BFlowVariableBase";

export type { BFlowVariableType } from "../shared/BFlowVariableBase";

// ─── Shared Primitives ─────────────────────────────────────────────

/** GUIDv7 identifier */
const GuidSchema = z.string().min(1, "GUID is required");

/** Name constraint — spaces NOT allowed, used for job/step/agent identifiers */
const NameSchema = z
  .string()
  .min(1, "Name must not be empty")
  .max(256)
  .regex(/^[^\s]+$/, "Name must not contain spaces");

// ─── Variable ──────────────────────────────────────────────────────

/**
 * BFlowVariable — Workflow YAML variable definition.
 *
 * The source of truth for the variable record shape is `BFlowVariableBaseSchema`
 * in `shared/BFlowVariableBase.ts`.  This schema extends the base with an
 * optional `id` field for workflow-level variables.
 *
 * NOTE: `BFlowVariableTypeSchema` is re-exported from the shared base to
 * ensure a single canonical source for variable types across the codebase.
 */
export const BFlowVariableSchema = BFlowVariableBaseSchema.extend({
  id: GuidSchema.optional(),
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
  "tailwind",
]);
export type BFlowStepOutputType = z.infer<typeof BFlowStepOutputTypeSchema>;

/**
 * Step output mode declaration.
 * `type` is now optional — defaults to `"markdown"` if omitted.
 */
export const BFlowStepOutputModeSchema = z.object({
  name: NameSchema,
  type: BFlowStepOutputTypeSchema.optional(),
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
  /**
   * Define structured output modes (named fields with types).
   * When this is set, the AI returns a JSON object with these fields.
   */
  output: z.array(BFlowStepOutputModeSchema).optional(),
  /**
   * Simple output type for the step's response format.
   * Only valid when `output` is NOT defined (i.e. no structured outputs).
   * If neither `output` nor `outputType` is set, defaults to "markdown".
   * Values: plain | markdown | json | html | csv | json_array | yaml | tailwind
   */
  outputType: BFlowStepOutputTypeSchema.optional(),
});
export type BFlowStep = z.infer<typeof BFlowStepSchema>;

// ─── Job ───────────────────────────────────────────────────────────

export const BFlowWorkflowJobSchema = z.object({
  /** guid */
  id: GuidSchema.optional(),
  /** Jobs avoid spaces */
  name: NameSchema,
  /** agent name reference */
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

/**
 * Agent definition. The `name` is the primary identifier (no spaces allowed).
 * `slug` has been removed — use `name` directly as the identifier.
 * `role` is now optional.
 */
export const BFlowWorkflowAgentSchema = z.object({
  id: GuidSchema.optional(),
  /** Agent identifier — non-space name used as the reference key */
  name: NameSchema,
  /** Agent role descriptor (optional) */
  role: z.string().optional(),
  /** System prompt / persona for this agent */
  prompt: z.string(),
});
export type BFlowWorkflowAgent = z.infer<typeof BFlowWorkflowAgentSchema>;

// ─── Workflow Report ───────────────────────────────────────────────

export const BFlowWorkflowReportSourceSchema = z.union([
  z.literal("job.step"),
  z.literal("job.step.outputs.__raw__"),
  z.string(), // Accepts "job.steps.outputs.{name}" patterns
]);
export type BFlowWorkflowReportSource = z.infer<
  typeof BFlowWorkflowReportSourceSchema
>;

export const BFlowWorkflowReportSchema = z.object({
  /** Report name (slug-like, used as identifier) */
  name: NameSchema,
  /** Optional label for the report heading */
  label: z.string().optional(),
  /** Source of the report data */
  source: BFlowWorkflowReportSourceSchema,
});
export type BFlowWorkflowReport = z.infer<typeof BFlowWorkflowReportSchema>;

// ─── Workflow (YAML Records Structure) ─────────────────────────────

/**
 * Root workflow YAML schema.
 *
 * Breaking changes from v1:
 * - `semanticVersion` is now optional
 * - `agentPools` is now optional
 * - `agents` is now optional (a warning is raised if undefined agents are referenced)
 * - `variables[].defaultValue` → `variables[].value`
 * - `variables[].type` is now optional
 * - `agents[].slug` removed — use `name` as identifier
 * - `agents[].role` is now optional
 * - `output` on steps: `type` is optional (defaults to `"markdown"`)
 * - Added `reports` (optional) for export configuration
 * - Added `outputType` (optional) on steps — only valid when `output` is empty
 */
export const BFlowWorkflowSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  /** semantic version of workflow e.g. 1.0.0 (optional) */
  semanticVersion: z.string().optional(),
  /** Variables that will be used in workflow */
  variables: z.array(BFlowVariableSchema).optional(),
  /** Agent pool slugs injected from flow (optional) */
  agentPools: z.array(z.string()).optional(),
  /** Agents setup inside workflow (optional — warning if referenced but not defined) */
  agents: z.array(BFlowWorkflowAgentSchema).optional(),
  /** Report configurations for export (optional) */
  reports: z.array(BFlowWorkflowReportSchema).optional(),
  /** Jobs - Steps that will execute */
  jobs: z.array(BFlowWorkflowJobSchema),
});
export type BFlowWorkflow = z.infer<typeof BFlowWorkflowSchema>;
