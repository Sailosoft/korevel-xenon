import { z } from "zod";

// ─── Pool Agent (individual agent within a pool) ─────────────────────

export const BFlowPoolAgentSchema = z.object({
  /** GUIDv7 */
  id: z.string(),
  /** GUIDv7 reference to BFlowPool */
  poolId: z.string(),
  /** Unique name for this agent (used as identifier in YAML agents:[]) */
  name: z.string().min(1),
  /** Agent role descriptor */
  role: z.string().optional(),
  /** System prompt / persona */
  prompt: z.string(),
  /** AI provider override */
  provider: z.string().optional(),
  /** AI model override */
  model: z.string().optional(),
  /** Capability tags */
  capabilities: z.array(z.string()).optional().default([]),
  /** Created timestamp */
  createdAt: z.date(),
  /** Updated timestamp */
  updatedAt: z.date(),
});
export type BFlowPoolAgentEntity = z.infer<typeof BFlowPoolAgentSchema>;

// ─── Form Schema ─────────────────────────────────────────────────────

export const BFlowPoolAgentFormSchema = z.object({
  poolId: z.string().min(1, "Pool is required"),
  name: z.string().min(1, "Name must not be empty").max(256),
  role: z.string().optional(),
  prompt: z.string().min(1, "Prompt is required"),
  provider: z.string().optional(),
  model: z.string().optional(),
  capabilities: z.array(z.string()).optional().default([]),
});
export type BFlowPoolAgentForm = z.infer<typeof BFlowPoolAgentFormSchema>;
