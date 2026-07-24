import { z } from "zod";
import {
  BFlowVariableBaseSchema,
  BFlowVariableTypeSchema,
} from "../shared/BFlowVariableBase";

export type { BFlowVariableType } from "../shared/BFlowVariableBase";

// ─── Shared Primitives ─────────────────────────────────────────────

const GuidSchema = z.string().min(1);

// ─── Flow Variable (individual variable within a group) ────────────

/**
 * BFlowFlowVariableEntity — IndexedDB entity for flow-scoped variables.
 *
 * Extends the canonical `BFlowVariableBaseSchema` (source of truth from
 * the workflow YAML definition) with entity-specific fields:
 *   - id         — GUIDv7 primary key
 *   - groupId    — reference to BFlowVariableGroup
 *   - createdAt  — creation timestamp
 *   - updatedAt  — last-updated timestamp
 *
 * NOTE: `type` is required at the entity level (unlike the base where
 * it defaults to "text" if omitted) because the DB always stores an
 * explicit type value.
 */
export const BFlowFlowVariableSchema = z.object({
  /** GUIDv7 */
  id: z.string(),
  /** GUIDv7 reference to BFlowVariableGroup */
  groupId: z.string(),
  /** Name of the variable (from base schema) */
  name: BFlowVariableBaseSchema.shape.name,
  /** Value of the variable (from base schema) */
  value: BFlowVariableBaseSchema.shape.value,
  /** Type of the variable (required at entity level) */
  type: BFlowVariableTypeSchema,
  /** Description of the variable */
  description: z.string().optional(),
  /** Created timestamp */
  createdAt: z.date(),
  /** Updated timestamp */
  updatedAt: z.date(),
});
export type BFlowFlowVariableEntity = z.infer<typeof BFlowFlowVariableSchema>;

// ─── Form Schema (user-editable fields only) ─────────────────────────

/**
 * Form schema for creating/updating a flow variable.
 * Excludes auto-generated fields: `id`, `createdAt`, `updatedAt`.
 *
 * Core variable fields (name, value, type, description) follow the
 * pattern defined in BFlowVariableBaseSchema.
 */
export const BFlowFlowVariableFormSchema = z.object({
  groupId: z.string().min(1, "Variable group is required"),
  name: BFlowVariableBaseSchema.shape.name,
  value: z.string().min(1, "Value is required"),
  type: BFlowVariableTypeSchema,
  description: z.string().optional(),
});

export type BFlowFlowVariableForm = z.infer<typeof BFlowFlowVariableFormSchema>;
