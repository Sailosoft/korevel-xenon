import { z } from "zod";

// ─── Shared Primitives ─────────────────────────────────────────────

const GuidSchema = z.string().min(1);

// ─── Global Variable ───────────────────────────────────────────────

export const BFlowVariableTypeSchema = z.enum([
  "text",
  "number",
  "boolean",
  "select",
  "textarea",
]);
export type BFlowVariableType = z.infer<typeof BFlowVariableTypeSchema>;

export const BFlowGlobalVariableSchema = z.object({
  /** GUIDv7 */
  id: z.string(),
  /** Name of the variable */
  name: z.string().min(1),
  /** Default value (used when no override exists at any higher level) */
  value: z.string(),
  /** Type of the variable */
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
 */
export const BFlowGlobalVariableFormSchema = z.object({
  name: z.string().min(1, "Name must not be empty").max(256),
  value: z.string().min(1, "Default value is required"),
  type: BFlowVariableTypeSchema,
  description: z.string().optional(),
  group: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type BFlowGlobalVariableForm = z.infer<
  typeof BFlowGlobalVariableFormSchema
>;
