// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCPromptMode Barrel
// Prompt mode types and builders for Agent, Plan, Ask, and Code modes
// ───────────────────────────────────────────────────────────────────────────────

/** Supported prompt modes */
export type LCPromptModeType = "agent" | "plan" | "ask" | "code";

export const PROMPT_MODE_LABELS: Record<LCPromptModeType, string> = {
  agent: "Agent",
  plan: "Plan",
  ask: "Ask",
  code: "Code",
};

export const PROMPT_MODE_DESCRIPTIONS: Record<LCPromptModeType, string> = {
  agent: "Full AI agent — reads, writes, and modifies code (conversation context)",
  plan: "Helps build a plan and asks questions before acting (conversation context)",
  ask: "Answers questions about the codebase without making changes (conversation context)",
  code: "Single-turn code generation — keeps context stash across prompts",
};

export { buildAgentPrompt } from "./LCPromptMode.Agent";
export { buildPlanPrompt } from "./LCPromptMode.Plan";
export { buildAskPrompt } from "./LCPromptMode.Ask";
export { buildCodePrompt } from "./LCPromptMode.Code";

/**
 * Build the prompt for a given mode.
 */
export function buildPrompt(
  mode: LCPromptModeType,
  params: {
    projectName: string;
    stashContext: string;
    userContent: string;
    fileTree?: Array<{ path: string; isDirectory: boolean }>;
  },
): string {
  switch (mode) {
    case "plan":
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require("./LCPromptMode.Plan").buildPlanPrompt(params);
    case "ask":
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require("./LCPromptMode.Ask").buildAskPrompt(params);
    case "code":
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require("./LCPromptMode.Code").buildCodePrompt(params);
    case "agent":
    default:
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require("./LCPromptMode.Agent").buildAgentPrompt(params);
  }
}
