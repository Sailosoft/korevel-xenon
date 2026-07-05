// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCPromptMode.Code
// Code mode: Single-turn prompt mode that keeps the context stash intact
// Unlike Agent/Plan/Ask modes which pass the full conversation history,
// Code mode sends only the latest user prompt + stash context.
// ───────────────────────────────────────────────────────────────────────────────

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
   - "FileName": string — ONLY the file name with extension (e.g. "App.tsx", "world.tsx"). Do NOT include directory path here.
   - "ExistingFile": boolean — true if the file already exists, false if new
   - "FileDirectory": string — the directory path relative to project root, WITHOUT the filename (e.g. "src/hello", "src/modules/lemon-coder/src")
   - "Description": string — brief description of what changed
   - "Content": string — the COMPLETE file content, ready to copy-paste. NOT a diff or snippet. The full file from first line to last.

IMPORTANT: Split file paths correctly. For a file shown as "--- File: src/hello/world.tsx ---", set FileDirectory="src/hello" and FileName="world.tsx". NEVER put the full path (e.g. "src/hello/world.tsx") into FileName — that field must contain ONLY the filename.

The "Content" field must contain the ENTIRE file — not just the changed parts, not a code snippet, not a diff. The complete source code that can be written directly to the file.
`;
}
