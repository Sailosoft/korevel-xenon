// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCPromptMode Barrel
// Prompt mode types and builders for Agent, Plan, and Ask modes
// ───────────────────────────────────────────────────────────────────────────────

/** Supported prompt modes */
export type LCPromptModeType = "agent" | "plan" | "ask";

export const PROMPT_MODE_LABELS: Record<LCPromptModeType, string> = {
  agent: "Agent",
  plan: "Plan",
  ask: "Ask",
};

export const PROMPT_MODE_DESCRIPTIONS: Record<LCPromptModeType, string> = {
  agent: "Full AI agent — reads, writes, and modifies code",
  plan: "Helps build a plan and asks questions before acting",
  ask: "Answers questions about the codebase without making changes",
};

export { buildAgentPrompt } from "./LCPromptMode.Agent";
export { buildPlanPrompt } from "./LCPromptMode.Plan";
export { buildAskPrompt } from "./LCPromptMode.Ask";

/**
 * Build the prompt for a given mode.
 */
export function buildPrompt(
  mode: LCPromptModeType,
  params: {
    projectName: string;
    stashContext: string;
    userContent: string;
  },
): string {
  switch (mode) {
    case "plan":
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require("./LCPromptMode.Plan").buildPlanPrompt(params);
    case "ask":
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require("./LCPromptMode.Ask").buildAskPrompt(params);
    case "agent":
    default:
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require("./LCPromptMode.Agent").buildAgentPrompt(params);
  }
}
