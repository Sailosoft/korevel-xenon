import { z } from "zod";

// ─── Association Variables (filled slot values) ──────────────────────────

export const BKAssociationSlotValueSchema = z.object({
  slotId: z.string().uuid(),
  value: z.string().default(""),
});

export type BKAssociationSlotValue = z.infer<typeof BKAssociationSlotValueSchema>;

// ─── Thought Association Entity ──────────────────────────────────────────

export const BKThoughtAssociationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Association name is required"),
  patternId: z.string().uuid(),
  description: z.string().optional(),
  slotValues: z.array(BKAssociationSlotValueSchema).default([]),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

export type BKThoughtAssociation = z.infer<typeof BKThoughtAssociationSchema>;

// ─── Form Types ──────────────────────────────────────────────────────────

export type BKThoughtAssociationForm = Omit<
  BKThoughtAssociation,
  "id" | "createdAt" | "updatedAt"
>;
