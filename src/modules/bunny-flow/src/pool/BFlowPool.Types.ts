import { z } from "zod";

// ─── BFlowPool — a group of agents scoped to a flow ─────────────────

export const BFlowPoolSchema = z.object({
  /** GUIDv7 */
  id: z.string(),
  /** Reference to the parent BFlowDefinition (flow) */
  flowId: z.string().min(1, "Flow is required"),
  /** Unique code for this pool, used for export/import */
  code: z.string().min(1),
  /** Human-readable name */
  name: z.string().min(1),
  /** Description of the pool's purpose */
  description: z.string().optional(),
  /** Pool status */
  status: z
    .enum(["draft", "active", "inactive", "archived"])
    .optional()
    .default("draft"),
  /** Created timestamp */
  createdAt: z.date(),
  /** Updated timestamp */
  updatedAt: z.date(),
});
export type BFlowPoolEntity = z.infer<typeof BFlowPoolSchema>;

// ─── Form Schema ────────────────────────────────────────────────────

export const BFlowPoolFormSchema = z.object({
  flowId: z.string().min(1, "Flow is required"),
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name must not be empty").max(256),
  description: z.string().optional(),
  status: z
    .enum(["draft", "active", "inactive", "archived"])
    .optional()
    .default("draft"),
});
export type BFlowPoolForm = z.infer<typeof BFlowPoolFormSchema>;
