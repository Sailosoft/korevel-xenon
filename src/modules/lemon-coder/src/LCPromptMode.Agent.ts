// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCPromptMode.Agent
// Default mode: Full AI agent that can read, write, and modify code
// ───────────────────────────────────────────────────────────────────────────────

import { buildEditOutputRules } from "./LCPromptMode.EditRules";

/**
 * Build the system prompt for Agent mode.
 * Agent mode is the default mode — it responds to user requests with
 * explanations and file changes (create/modify files).
 */
export function buildAgentPrompt(params: {
  projectName: string;
  stashContext: string;
  userContent: string;
}): string {
  const { projectName, stashContext, userContent } = params;

  return [
    "Project: " + projectName,
    "",
    "### Stashed Context:",
    stashContext || "(None)",
    "",
    "### Instruction:",
    userContent,
    "",
    ...buildEditOutputRules(),
  ].join("\n");
}
