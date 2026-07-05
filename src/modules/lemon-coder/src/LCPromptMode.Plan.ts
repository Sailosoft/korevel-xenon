// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCPromptMode.Plan
// Plan mode: Helps build a plan, asks questions, and builds context before acting
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Build the system prompt for Plan mode.
 * Plan mode is designed to help the user think through a problem first:
 * - Asks clarifying questions
 * - Builds context about the codebase
 * - Creates a structured plan before any code changes
 * - Does NOT generate file contents directly
 */
export function buildPlanPrompt(params: {
  projectName: string;
  stashContext: string;
  userContent: string;
}): string {
  const { projectName, stashContext, userContent } = params;

  return `
Project: ${projectName}

### Stashed Context Files (full contents):
${stashContext || "(No files stashed)"}

### User Request:
${userContent}

### Mode: PLAN
You are in Plan mode. Your role is to help the user think through their request before any code is written. Follow these steps:

1. **Analyze** the user's request and the provided context files.
2. **Ask questions** if anything is unclear — file locations, naming conventions, architectural decisions.
3. **Propose a plan** — break down the work into clear steps.
4. **Do NOT generate file contents** — this mode is for planning only.

### Response Format:
You MUST respond with a valid JSON object containing exactly these two fields:
1. "AIMessage": A string — your structured plan in markdown format. Include a summary, steps, questions, context needed, and estimated impact.
2. "FileContents": An empty array [] — since you are in Plan mode, you must NOT generate any file changes.

IMPORTANT: Since you are in Plan mode, always set "FileContents" to an empty array [].
`;
}
