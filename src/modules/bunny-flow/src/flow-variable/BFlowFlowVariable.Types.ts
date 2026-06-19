import { z } from "zod";

// ─── Shared Primitives ─────────────────────────────────────────────

const GuidSchema = z.string().min(1);

// ─── Variable Type ─────────────────────────────────────────────────

export const BFlowVariableTypeSchema = z.enum([
  "text",
  "number",
  "boolean",
  "select",
  "textarea",
]);
export type BFlowVariableType = z.infer<typeof BFlowVariableTypeSchema>;

// ─── Flow Variable (individual variable within a group) ────────────

export const BFlowFlowVariableSchema = z.object({
  /** GUIDv7 */
  id: z.string(),
  /** GUIDv7 reference to BFlowVariableGroup */
  groupId: z.string(),
  /** Name of the variable */
  name: z.string().min(1),
  /** Value of the variable */
  value: z.string(),
  /** Type of the variable */
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
 */
export const BFlowFlowVariableFormSchema = z.object({
  groupId: z.string().min(1, "Variable group is required"),
  name: z.string().min(1, "Name must not be empty").max(256),
  value: z.string().min(1, "Value is required"),
  type: BFlowVariableTypeSchema,
  description: z.string().optional(),
});

export type BFlowFlowVariableForm = z.infer<typeof BFlowFlowVariableFormSchema>;
