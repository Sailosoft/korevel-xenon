import { z } from "zod";

// ─── Idea Entity ─────────────────────────────────────────────────────────

export const BKIdeaSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Idea name is required"),
  idea: z.string().min(1, "Idea content is required"),
  tags: z.string().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

export type BKIdea = z.infer<typeof BKIdeaSchema>;

// ─── Form Types ──────────────────────────────────────────────────────────

export type BKIdeaForm = Omit<BKIdea, "id" | "createdAt" | "updatedAt">;

// ─── Idea Thought Mapping ────────────────────────────────────────────────

export const BKThoughtIdeaSchema = z.object({
  id: z.string().uuid(),
  thoughtId: z.string().uuid(),
  ideaId: z.string().uuid(),
});

export type BKThoughtIdea = z.infer<typeof BKThoughtIdeaSchema>;

export const BKTrainOfThoughtIdeaSchema = z.object({
  id: z.string().uuid(),
  ideaId: z.string().uuid(),
  trainOfThoughtId: z.string().uuid(),
});

export type BKTrainOfThoughtIdea = z.infer<typeof BKTrainOfThoughtIdeaSchema>;
