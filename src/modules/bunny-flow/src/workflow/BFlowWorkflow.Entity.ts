import { z } from "zod";
import { BFlowWorkflowSchema } from "./BFlowWorkflow.Types";

// ─── Workflow Template (Entity) ────────────────────────────────────

export const BFlowWorkflowStatusSchema = z.enum([
  "draft",
  "published",
  "archived",
]);
export type BFlowWorkflowStatus = z.infer<typeof BFlowWorkflowStatusSchema>;

export const BFlowWorkflowTemplateSchema = z.object({
  /** GUIDv7 */
  id: z.string(),
  /** GUIDv7 reference to BFlowDefinition */
  flowId: z.string(),
  /** Name of the workflow */
  name: z.string().min(1),
  /** Slug */
  slug: z.string().min(1),
  /** Description of the workflow */
  description: z.string().optional(),
  /** Version of the workflow */
  version: z.string().optional(),
  /** Status of the workflow */
  status: BFlowWorkflowStatusSchema.optional().default("draft"),
  /** Metadata of the workflow */
  metadata: z.record(z.string(), z.unknown()).optional(),
  /** Template YAML string */
  templateYaml: z.string(),
  /** Actual workflow data (parsed from YAML) */
  template: BFlowWorkflowSchema,
  /** Created timestamp */
  createdAt: z.date(),
  /** Updated timestamp */
  updatedAt: z.date(),
});
export type BFlowWorkflowTemplateEntity = z.infer<
  typeof BFlowWorkflowTemplateSchema
>;

// ─── Form Schema (user-editable fields only) ─────────────────────────

/**
 * Form schema for creating/updating a workflow template.
 * Excludes auto-generated fields: `id`, `createdAt`, `updatedAt`.
 */
export const BFlowWorkflowTemplateFormSchema = z.object({
  flowId: z.string().min(1, "Flow definition is required"),
  name: z.string().min(1, "Name must not be empty").max(256),
  slug: z.string().min(1, "Slug must not be empty").max(128),
  description: z.string().optional(),
  version: z.string().optional(),
  status: BFlowWorkflowStatusSchema.optional().default("draft"),
  metadata: z.record(z.string(), z.unknown()).optional(),
  templateYaml: z.string().min(1, "Template YAML is required"),
});

export type BFlowWorkflowTemplateForm = z.infer<
  typeof BFlowWorkflowTemplateFormSchema
>;
