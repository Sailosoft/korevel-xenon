// BKStepAIGenerate.Config.ts
//
// Configuration for Generative AI step generation.
// Used by BKStepAIGenerate / BKStepAIGenerate.Modal, BKThoughtDetailPage,
// and BKThinkStudioAnon to produce train-of-thought steps from an AI model
// in a selected production mode.
//
// Modes:
// - Plain           → faithful step-by-step driven by the user's input
// - Analytic        → analytic steps + a final summary step
// - Plan            → planning steps
// - SDLC            → software engineering life cycle steps
// - ContentWriting  → content writing steps
// - Guide           → step-by-step chain of thought guide
// - Architecture    → software architecture steps
// - Research        → structured research and investigation steps
// - Brainstorm      → divergent creative ideation steps
// - Decision        → option analysis and recommendation steps
// - Debug           → systematic troubleshooting steps
// - Review          → critical evaluation and improvement steps
// - Teaching        → scaffolded lesson steps

// ─── Mode identifiers ─────────────────────────────────────────────────────

export type BKStepGenerationMode =
  | "plain"
  | "analytic"
  | "plan"
  | "sdlc"
  | "contentWriting"
  | "guide"
  | "architecture"
  | "research"
  | "brainstorm"
  | "decision"
  | "debug"
  | "review"
  | "teaching";

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
    id: "plain",
    label: "Plain",
    description:
      "Create simple step-by-step steps focused on the user's input.",
    instruction: `Produce PLAIN steps. Create a clear, step-by-step sequence driven primarily by the user's direction and the thought content. Keep each step simple, direct, and faithful to exactly what the user asked for. Do NOT impose extra frameworks, analysis, or structure beyond what is needed to fulfill the input.`,
  },
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
  {
    id: "research",
    label: "Research",
    description: "Produce structured research and investigation steps.",
    instruction: `Produce RESEARCH steps. Break the topic into a rigorous investigation: define the research question, identify credible sources/data, gather and verify evidence, compare conflicting findings, and synthesize insights. ALWAYS end with a synthesis step covering implications and open questions.`,
  },
  {
    id: "brainstorm",
    label: "Brainstorm",
    description: "Generate a wide spread of creative ideas.",
    instruction: `Produce BRAINSTORMING steps. Focus on divergent ideation: reframe the problem, generate a broad set of ideas without judging, use prompts/analogies/constraints to push past the obvious, cluster related ideas, then converge on the most promising candidates with next steps.`,
  },
  {
    id: "decision",
    label: "Decision",
    description: "Weigh options and reach a recommendation.",
    instruction: `Produce DECISION-MAKING steps. Frame the decision and success criteria, enumerate the realistic options, define evaluation criteria, analyze trade-offs, costs, and risks per option, then conclude with a clear recommendation and rationale.`,
  },
  {
    id: "debug",
    label: "Debug",
    description: "Diagnose and fix a problem systematically.",
    instruction: `Produce DEBUGGING steps. Follow a systematic troubleshooting flow: reproduce the issue, gather symptoms/logs, isolate the failure, form and rank hypotheses, test each hypothesis, identify the root cause, apply a fix, and verify with regression checks.`,
  },
  {
    id: "review",
    label: "Review",
    description: "Critically evaluate and improve existing work.",
    instruction: `Produce REVIEW steps. Critically evaluate the subject against clear criteria: restate intent and standards, inspect structure/content/correctness, note strengths, list concrete issues ranked by severity, and give prioritized, actionable improvement recommendations.`,
  },
  {
    id: "teaching",
    label: "Teaching",
    description: "Turn a topic into a scaffolded lesson.",
    instruction: `Produce TEACHING steps. Build a learner-centered lesson: state learning objectives, activate prior knowledge, explain core concepts simply with analogies, work through examples, provide guided and independent practice, check understanding, then summarize key takeaways.`,
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

/**
 * Sort production modes alphabetically by label, keeping the "plain" mode
 * pinned to the first position regardless of its label.
 */
export function bkSortStepGenerationModes(
  modes: BKStepGenerationModeConfig[] = BK_STEP_GENERATION_MODES,
): BKStepGenerationModeConfig[] {
  return [...modes].sort((a, b) => {
    const aPlain = a.id === "plain";
    const bPlain = b.id === "plain";
    if (aPlain || bPlain) {
      return aPlain === bPlain ? 0 : aPlain ? -1 : 1;
    }
    return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
  });
}

/** Production modes in display order: "plain" first, then alphabetical. */
export const BK_STEP_GENERATION_MODES_SORTED: BKStepGenerationModeConfig[] =
  bkSortStepGenerationModes();
