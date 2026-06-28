import { z } from "zod";

// ─── Roles ───────────────────────────────────────────────────────────────

export const BKThinkerRoles = [
  "SoftwareEngineer",
  "ProjectManager",
  "BusinessAnalyst",
  "SoftwareDeveloper",
  "MedicalReviewer",
  "MedicalPractioner",
  "WebDesigner",
  "QualityAssurance",
  "Vlogger",
] as const;

export const BKThinkerRoleEnum = z.enum(BKThinkerRoles);
export type BKThinkerRole = z.infer<typeof BKThinkerRoleEnum>;

// ─── Entity Schema ────────────────────────────────────────────────────────

export const BKThinkerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Thinker name is required"),
  description: z.string().min(1, "Description is required"),
  rules: z.string().optional(),
  role: BKThinkerRoleEnum,
  specialization: z.string().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

export type BKThinker = z.infer<typeof BKThinkerSchema>;

// ─── Swarm Result ─────────────────────────────────────────────────────────

export interface BKThinkerSwarmResult {
  thinkers: BKThinker[];
}

// ─── Form Types ──────────────────────────────────────────────────────────

export type BKThinkerForm = Omit<BKThinker, "id" | "createdAt" | "updatedAt">;
