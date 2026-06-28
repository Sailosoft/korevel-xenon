import { z } from "zod";

// ─── Pattern Memory Slot (variable definitions) ──────────────────────────

export const BKPatternMemorySlotSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Slot name is required"),
  label: z.string().optional(),
  type: z.enum(["text", "textarea", "editor", "code-editor"]),
  defaultValue: z.string().default(""),
  required: z.boolean().default(false),
});

export type BKPatternMemorySlot = z.infer<typeof BKPatternMemorySlotSchema>;

// ─── Thought Pattern Entity ──────────────────────────────────────────────

export const BKThoughtPatternSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Pattern name is required"),
  group: z.string().optional(),
  description: z.string().optional(),
  slots: z.array(BKPatternMemorySlotSchema).default([]),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

export type BKThoughtPattern = z.infer<typeof BKThoughtPatternSchema>;

// ─── Form Types ──────────────────────────────────────────────────────────

export type BKThoughtPatternForm = Omit<
  BKThoughtPattern,
  "id" | "createdAt" | "updatedAt"
>;

// ─── Group Options ──────────────────────────────────────────────────────

export const BK_PATTERN_GROUPS = [
  "General",
  "Analysis",
  "Creative",
  "Technical",
  "Strategic",
  "Research",
] as const;
