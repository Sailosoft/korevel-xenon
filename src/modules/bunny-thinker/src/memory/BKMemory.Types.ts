import { z } from "zod";

// ─── Memory Neuron (individual output piece) ─────────────────────────────

export const BKMemoryNeuronSchema = z.object({
  id: z.string().uuid(),
  memoryId: z.string().uuid(),
  thoughtId: z.string().uuid().optional(),
  trainOfThoughtId: z.string().uuid().optional(),
  name: z.string().min(1, "Neuron name is required"),
  value: z.string(),
  order: z.number().default(0),
  /**
   * Optional per-neuron render format override.
   * When set, overrides the parent memory's format for this neuron.
   */
  format: z.string().optional(),
});

export type BKMemoryNeuron = z.infer<typeof BKMemoryNeuronSchema>;

// ─── Memory Entity ───────────────────────────────────────────────────────

export const BKMemorySchema = z.object({
  id: z.string().uuid(),
  thinkId: z.string().uuid(),
  name: z.string().min(1, "Memory name is required"),
  description: z.string().optional(),
  /**
   * Raw AI conversation output before craft processing
   */
  rawOutput: z.string().optional(),
  /**
   * Processed output after craft engine formatting
   */
  processedOutput: z.string().optional(),
  /**
   * Craft format used
   */
  format: z.string().default("markdown"),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

export type BKMemory = z.infer<typeof BKMemorySchema>;

// ─── Form Types ──────────────────────────────────────────────────────────

export type BKMemoryForm = Omit<BKMemory, "id" | "createdAt" | "updatedAt">;
