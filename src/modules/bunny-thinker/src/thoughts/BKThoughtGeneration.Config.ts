// BKThoughtGeneration.Config.ts
//
// Configuration for Generative AI step generation.
// Used by both BKThoughtDetailPage and BKThinkStudioAnon to produce
// train-of-thought steps from an AI model in a selected production mode.
//
// Modes:
// - Analytic        → analytic steps + a final summary step
// - Plan            → planning steps
// - SDLC            → software engineering life cycle steps
// - ContentWriting  → content writing steps
// - Guide           → step-by-step chain of thought guide
// - Architecture    → software architecture steps

// ─── Mode identifiers ─────────────────────────────────────────────────────

export type BKStepGenerationMode =
  | "analytic"
  | "plan"
  | "sdlc"
  | "contentWriting"
  | "guide"
  | "architecture";

// ─── How generated steps merge with existing steps ───────────────────────

export type BKStepGenerationStrategy = "append" | "override";

// ─── Mode definitions ─────────────────────────────────────────────────────

export interface BKStepGenerationModeConfig {
  id: BKStepGenerationMode;
  label: string;
  /** Short human-readable description shown in the UI picker. */
  description: string;
  /** Detailed instruction injected into the AI prompt for this mode. */
  instruction: string;
}

export const BK_STEP_GENERATION_MODES: BKStepGenerationModeConfig[] = [
  {
    id: "analytic",
    label: "Analytic",
    description:
      "Produce analytic steps with a final summary step at the end.",
    instruction: `Produce ANALYTIC steps. Break the topic down into objective, evidence-based analysis steps: define the subject, gather relevant facts, examine causes/effects, weigh evidence, and draw conclusions. ALWAYS end the sequence with a FINAL SUMMARY step that consolidates findings, insights, and conclusions.`,
  },
  {
    id: "plan",
    label: "Plan",
    description: "Focus on producing planning steps.",
    instruction: `Produce PLANNING steps. Focus on goal setting, scope definition, requirement gathering, resource and effort planning, sequencing, risk identification, and an execution plan with clear milestones.`,
  },
  {
    id: "sdlc",
    label: "SDLC",
    description:
      "Focus on software engineering defining life cycle steps.",
    instruction: `Produce SDLC (Software Development Life Cycle) steps. Define the full software engineering lifecycle: requirements analysis, system design, implementation, testing, deployment, and maintenance/iteration. Cover relevant engineering considerations at each stage.`,
  },
  {
    id: "contentWriting",
    label: "ContentWriting",
    description: "Focus on creating content writing steps.",
    instruction: `Produce CONTENT WRITING steps. Focus on defining the audience and goal, topic research, outlining, drafting, revising, editing for clarity and tone, and final proofreading/polish for written content.`,
  },
  {
    id: "guide",
    label: "Guide",
    description: "Create a chain of thought step by step guides.",
    instruction: `Produce GUIDE steps. Create a chain of thought that walks through the process step-by-step as a clear, beginner-friendly guide: introduction/overview, prerequisites, ordered instructional steps, and a wrap-up/conclusion.`,
  },
  {
    id: "architecture",
    label: "Architecture",
    description: "Focus on building software architecture.",
    instruction: `Produce ARCHITECTURE steps. Focus on designing software architecture: requirements and constraints, high-level system design, component breakdown, data flow and storage, integrations, scalability, security, and trade-off analysis.`,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────

export function bkGetStepGenerationMode(
  mode: BKStepGenerationMode,
): BKStepGenerationModeConfig {
  return (
    BK_STEP_GENERATION_MODES.find((m) => m.id === mode) ??
    BK_STEP_GENERATION_MODES[0]
  );
}
