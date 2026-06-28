import { z } from "zod";
import { BKConversationMessageSchema } from "../thoughts/BKThoughts.Types";

// ─── Think Status ────────────────────────────────────────────────────────

export const BKThinkStatuses = [
  "draft",
  "thinking",
  "consolidating",
  "completed",
  "error",
] as const;

export const BKThinkStatusEnum = z.enum(BKThinkStatuses);
export type BKThinkStatus = z.infer<typeof BKThinkStatusEnum>;

// ─── Think Entity ────────────────────────────────────────────────────────

export const BKThinkSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1, "Think name is required"),
  description: z.string().optional(),
  thoughtId: z.string().uuid(),
  thoughtAssociationId: z.string().uuid().optional(),
  thinkConversation: z.array(BKConversationMessageSchema).default([]),
  status: BKThinkStatusEnum.default("draft"),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

export type BKThink = z.infer<typeof BKThinkSchema>;

// ─── Form Types ──────────────────────────────────────────────────────────

export type BKThinkForm = Omit<BKThink, "id" | "createdAt" | "updatedAt">;
