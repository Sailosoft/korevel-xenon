import { z } from "zod";

// ─── Conversation Message ────────────────────────────────────────────────

export const BKConversationMessageSchema = z.object({
  role: z.enum(["system", "assistant", "user"]),
  content: z.string(),
  timestamp: z.number(),
});

export type BKConversationMessage = z.infer<typeof BKConversationMessageSchema>;

// ─── Train of Thought (preplanned conversation step) ─────────────────────

export const BKTrainOfThoughtSchema = z.object({
  id: z.string().uuid(),
  thoughtId: z.string().uuid(),
  name: z.string().min(1, "Train of thought name is required"),
  label: z.string().optional(),
  thought: z.string().min(1, "Thought content is required"),
  order: z.number().default(0),
  /**
   * When enabled, the output of this train of thought will be included
   * in memory and exportable formats.
   */
  includeInMemory: z.boolean().default(true),
  craftId: z.string().uuid().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

export type BKTrainOfThought = z.infer<typeof BKTrainOfThoughtSchema>;

// ─── Thought Entity (main thought / conversation) ────────────────────────

export const BKThoughtSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Thought name is required"),
  thought: z.string().min(1, "Thought content is required"),
  description: z.string().optional(),
  patternId: z.string().uuid().optional(),
  ideaIds: z.array(z.string().uuid()).default([]),
  craftId: z.string().uuid().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

export type BKThought = z.infer<typeof BKThoughtSchema>;

// ─── Form Types ──────────────────────────────────────────────────────────

export type BKThoughtForm = Omit<BKThought, "id" | "createdAt" | "updatedAt">;

export type BKTrainOfThoughtForm = Omit<
  BKTrainOfThought,
  "id" | "createdAt" | "updatedAt"
>;
