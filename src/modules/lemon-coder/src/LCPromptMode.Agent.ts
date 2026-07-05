// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCPromptMode.Agent
// Default mode: Full AI agent that can read, write, and modify code
// ───────────────────────────────────────────────────────────────────────────────

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

  return `
Project: ${projectName}

### Stashed Context Files (full contents):
${stashContext || "(No files stashed)"}

### User Instruction:
${userContent}

### Response Format:
You MUST respond with a valid JSON object containing exactly these two fields:
1. "AIMessage": A string — your explanation or response to the user.
2. "FileContents": An array of file objects. Each file object has:
   - "FileName": string — the file name (e.g. "App.tsx")
   - "ExistingFile": boolean — true if the file already exists, false if new
   - "FileDirectory": string — the directory path relative to project root
   - "Description": string — brief description of what changed
   - "Content": string — the COMPLETE file content, ready to copy-paste. NOT a diff or snippet. The full file from first line to last.

IMPORTANT: The "Content" field must contain the ENTIRE file — not just the changed parts, not a code snippet, not a diff. The complete source code that can be written directly to the file.
`;
}
