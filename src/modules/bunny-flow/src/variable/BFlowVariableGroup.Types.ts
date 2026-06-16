import { z } from "zod";

// ─── Shared Primitives ─────────────────────────────────────────────

const GuidSchema = z.string().min(1);

// ─── Variable (within group) ───────────────────────────────────────

export const BFlowVariableTypeSchema = z.enum([
  "text",
  "number",
  "boolean",
  "select",
  "textarea",
]);
export type BFlowVariableType = z.infer<typeof BFlowVariableTypeSchema>;

export const BFlowVariableSchema = z.object({
  id: GuidSchema,
  /** GUID of group */
  groupId: z.string(),
  name: z.string().min(1),
  value: z.string(),
  type: BFlowVariableTypeSchema,
  description: z.string().optional(),
});
export type BFlowVariable = z.infer<typeof BFlowVariableSchema>;

// ─── Variable Group ────────────────────────────────────────────────

export const BFlowVariableGroupSchema = z.object({
  /** GUIDv7 */
  id: z.string(),
  /** GUIDv7 reference to BFlowDefinition */
  flowId: z.string(),
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
