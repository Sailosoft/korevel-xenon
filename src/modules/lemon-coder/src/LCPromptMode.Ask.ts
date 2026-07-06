// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCPromptMode.Ask
// Ask mode: Answer questions about the codebase without making changes
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Build the system prompt for Ask mode.
 * Ask mode is a read-only mode that answers questions about the codebase:
 * - Explains code
 * - Provides recommendations
 * - Answers technical questions
 * - Does NOT generate any file contents or code modifications
 */
export function buildAskPrompt(params: {
  projectName: string;
  stashContext: string;
  userContent: string;
}): string {
  const { projectName, stashContext, userContent } = params;

  return `
Project: ${projectName}

### Stashed Context Files (full contents):
${stashContext || "(No files stashed)"}

### User Question:
${userContent}

### Mode: ASK
You are in Ask mode. Your role is to answer questions, explain code, and provide information only.

**You must NOT:**
- Generate or modify any files
- Provide code snippets that overwrite files
- Change the codebase in any way

**You SHOULD:**
- Explain how the code works
- Provide recommendations and best practices
- Answer technical questions
- Help the user understand the codebase

### Response Format:
You MUST respond with a valid JSON object containing exactly these two fields:
1. "AIMessage": A string — your detailed answer to the user's question in markdown format.
2. "FileContents": An empty array [] — since you are in Ask mode, you must NOT generate any file changes.

### JSON Rules:
- Never use trailing commas in objects or arrays. WRONG: [1, 2,] RIGHT: [1, 2]
- Escape all double quotes inside the AIMessage string as \\" if they appear.
- Verify your JSON is valid before responding.

### IMPORTANT:
Since you are in Ask mode, always set "FileContents" to an empty array [].
`;
}
