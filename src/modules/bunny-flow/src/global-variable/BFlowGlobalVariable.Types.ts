import { z } from "zod";
import {
  BFlowVariableBaseSchema,
  BFlowVariableTypeSchema,
} from "../shared/BFlowVariableBase";

export type { BFlowVariableType } from "../shared/BFlowVariableBase";

// ─── Shared Primitives ─────────────────────────────────────────────

const GuidSchema = z.string().min(1);

// ─── Global Variable ───────────────────────────────────────────────

/**
 * BFlowGlobalVariableEntity — IndexedDB entity for global (workspace-level) variables.
 *
 * Extends the canonical `BFlowVariableBaseSchema` (source of truth from
 * the workflow YAML definition) with entity-specific fields:
 *   - id         — GUIDv7 primary key
 *   - group      — optional grouping tag (e.g. "system", "env", "custom")
 *   - metadata   — extensibility key-value store
 *   - createdAt  — creation timestamp
 *   - updatedAt  — last-updated timestamp
 *
 * Core variable fields (name, value, type, description) follow the
 * pattern defined in BFlowVariableBaseSchema.
 */
export const BFlowGlobalVariableSchema = z.object({
  /** GUIDv7 */
  id: z.string(),
  /** Name of the variable (from base schema) */
  name: BFlowVariableBaseSchema.shape.name,
  /** Default value (from base schema) */
  value: BFlowVariableBaseSchema.shape.value,
  /** Type of the variable (required at entity level) */
  type: BFlowVariableTypeSchema,
  /** Description of the variable */
  description: z.string().optional(),
  /** Variable group tag for organisation (e.g. "system", "env", "custom") */
  group: z.string().optional(),
  /** Metadata for extensibility */
  metadata: z.record(z.string(), z.unknown()).optional(),
  /** Created timestamp */
  createdAt: z.date(),
  /** Updated timestamp */
  updatedAt: z.date(),
});
export type BFlowGlobalVariableEntity = z.infer<
  typeof BFlowGlobalVariableSchema
>;

// ─── Form Schema (user-editable fields only) ─────────────────────────

/**
 * Form schema for creating/updating a global variable.
 * Excludes auto-generated fields: `id`, `createdAt`, `updatedAt`.
 *
 * Core variable fields (name, value, type, description) follow the
 * pattern defined in BFlowVariableBaseSchema.
 */
export const BFlowGlobalVariableFormSchema = z.object({
  name: BFlowVariableBaseSchema.shape.name,
  value: z.string().min(1, "Default value is required"),
  type: BFlowVariableTypeSchema,
  description: z.string().optional(),
  group: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type BFlowGlobalVariableForm = z.infer<
  typeof BFlowGlobalVariableFormSchema
>;
