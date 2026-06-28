 // BKProcess.Types.ts
//
// Process entity — binds Thought Association → Thought → Export to Memory
// into an end-to-end workflow. A Process orchestrates the resolve, think,
// and export pipeline for a single run.
//
// Flow: Association (slot values) → Thought (train of thoughts) → Think (AI)
//       → Memory (neuron export)

import { z } from "zod";

// ─── Process Status ───────────────────────────────────────────────────────

export const BKProcessStatuses = [
  "draft",
  "resolving",
  "ready",
  "processing",
  "completed",
  "error",
] as const;

export const BKProcessStatusEnum = z.enum(BKProcessStatuses);
export type BKProcessStatus = z.infer<typeof BKProcessStatusEnum>;

// ─── Process Entity ───────────────────────────────────────────────────────

export const BKProcessSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Process name is required"),
  description: z.string().optional(),

  /**
   * The Thought Association whose slot values will be resolved into
   * the thought context before execution.
   */
  associationId: z.string().uuid(),

  /**
   * The Thought whose content and train-of-thoughts will be executed.
   * May be pre-existing or created at resolve time.
   */
  thoughtId: z.string().uuid(),

  /**
   * The Think session created when the process executes.
   * Populated after the process transitions from "ready" → "processing".
   */
  thinkId: z.string().uuid().optional(),

  /**
   * The Memory record created when the process exports results.
   * Populated after the process transitions from "processing" → "completed".
   */
  memoryId: z.string().uuid().optional(),

  /**
   * Current orchestration status.
   */
  status: BKProcessStatusEnum.default("draft"),

  /**
   * Optional error message when status is "error".
   */
  errorMessage: z.string().optional(),

  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

export type BKProcess = z.infer<typeof BKProcessSchema>;

// ─── Form Types ──────────────────────────────────────────────────────────

export type BKProcessForm = Omit<
  BKProcess,
  "id" | "createdAt" | "updatedAt"
>;

// ─── Execution Result ─────────────────────────────────────────────────────

export interface BKProcessExecutionResult {
  success: boolean;
  thinkId?: string;
  memoryId?: string;
  error?: string;
  conversation?: Array<{
    role: "system" | "assistant" | "user";
    content: string;
    timestamp: number;
  }>;
  output?: string;
}
