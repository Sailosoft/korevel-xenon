// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCPromptMode.Code
// Code mode: Single-turn prompt mode that keeps the context stash intact
// Unlike Agent/Plan/Ask modes which pass the full conversation history,
// Code mode sends only the latest user prompt + stash context.
// ───────────────────────────────────────────────────────────────────────────────

import { buildEditOutputRules } from "./LCPromptMode.EditRules";

/**
 * Build the system prompt for Code mode.
 * Code mode is a focused, single-turn mode for code generation:
 * - Takes the current user prompt + stashed files as context
 * - Does NOT accumulate conversation history
 * - Keeps the context stash across turns
 */
export function buildCodePrompt(params: {
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
