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
   - "FileName": string — ONLY the file name with extension (e.g. "App.tsx", "index.ts"). Do NOT include directory path here.
   - "ExistingFile": boolean — true if the file already exists, false if new
   - "FileDirectory": string — the directory path relative to project root, WITHOUT the filename (e.g. "components/ui", "modules/lemon-coder/src"). Do NOT start with a leading "/" or "src/" unless the file tree path actually begins with "src/". Match the directory portion of the path exactly as it appears in the "--- File: ... ---" line from the stashed context.
   - "Description": string — brief description of what changed
   - "Content": string — the COMPLETE file content, ready to copy-paste. NOT a diff or snippet. The full file from first line to last.

IMPORTANT: Split file paths correctly. For a file shown as "--- File: components/ui/Button.tsx ---", set FileDirectory="components/ui" and FileName="Button.tsx". NEVER put the full path (e.g. "components/ui/Button.tsx") into FileName — that field must contain ONLY the filename.

CRITICAL: Match the path format from the stashed context files exactly. If the file tree shows "modules/hello/world.tsx" (without a "src/" prefix), do NOT prepend "src/" to FileDirectory. Use the path exactly as shown in the "--- File: ... ---" lines.

The "Content" field must contain the ENTIRE file — not just the changed parts, not a code snippet, not a diff. The complete source code that can be written directly to the file.
`;
}
