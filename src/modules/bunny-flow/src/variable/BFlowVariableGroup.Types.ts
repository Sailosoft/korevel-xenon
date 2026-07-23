import { z } from "zod";
import {
  BFlowVariableBaseSchema,
  BFlowVariableTypeSchema,
} from "../shared/BFlowVariableBase";

export type { BFlowVariableType } from "../shared/BFlowVariableBase";

// ─── Shared Primitives ─────────────────────────────────────────────

const GuidSchema = z.string().min(1);

// ─── Variable (within group) ───────────────────────────────────────

/**
 * BFlowVariable — Variable record within a group.
 *
 * Extends the canonical `BFlowVariableBaseSchema` (source of truth from
 * the workflow YAML definition) with entity-specific fields:
 *   - id       — GUIDv7 primary key
 *   - groupId  — reference to the parent BFlowVariableGroup
 *
 * Core variable fields (name, value, type, description) follow the
 * pattern defined in BFlowVariableBaseSchema.
 */
export const BFlowVariableSchema = z.object({
  id: GuidSchema,
  /** GUID of group */
  groupId: z.string(),
  /** Name of the variable (from base schema) */
  name: BFlowVariableBaseSchema.shape.name,
  /** Value of the variable (from base schema) */
  value: BFlowVariableBaseSchema.shape.value,
  /** Type of the variable (required at entity level) */
  type: BFlowVariableTypeSchema,
  /** Description of the variable */
  description: z.string().optional(),
});
export type BFlowVariable = z.infer<typeof BFlowVariableSchema>;

// ─── Variable Group ────────────────────────────────────────────────

/**
 * BFlowVariableGroup — A named group of variables scoped to a flow definition
 * and optionally linked to a specific workflow template.
 *
 * When `workflowId` is set, the available variables within this group follow
 * the variable definitions from the selected workflow's YAML schema
 * (`BFlowWorkflowSchema.variables`), using `BFlowVariableBaseSchema` as the
 * canonical pattern for each variable record.
 */
export const BFlowVariableGroupSchema = z.object({
  /** GUIDv7 */
  id: z.string(),
  /** GUIDv7 reference to BFlowDefinition */
  flowId: z.string(),
  /** GUIDv7 reference to BFlowWorkflowTemplate (optional).
   *  When set, variables in this group derive their pattern from the
   *  workflow's YAML variable definitions. */
  workflowId: z.string().optional(),
  /** Name of the group */
  name: z.string().min(1),
  /** Slug */
  slug: z.string().min(1),
  /** Description of the group */
  description: z.string().optional(),
  /** Metadata of the group */
  metadata: z.record(z.string(), z.unknown()).optional(),
  /** Created timestamp */
  createdAt: z.date(),
  /** Updated timestamp */
  updatedAt: z.date(),
});
export type BFlowVariableGroupEntity = z.infer<typeof BFlowVariableGroupSchema>;

// ─── Form Schema (user-editable fields only) ─────────────────────────

/**
 * Form schema for creating/updating a variable group.
 * Excludes auto-generated fields: `id`, `createdAt`, `updatedAt`.
 */
export const BFlowVariableGroupFormSchema = z.object({
  flowId: z.string().min(1, "Flow definition is required"),
  workflowId: z.string().optional(),
  name: z.string().min(1, "Name must not be empty").max(256),
  slug: z.string().min(1, "Slug must not be empty").max(128),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type BFlowVariableGroupForm = z.infer<
  typeof BFlowVariableGroupFormSchema
>;
