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
   - "FileName": string — ONLY the file name with extension.
   - "ExistingFile": boolean — true if the file already exists, false if new.
   - "FileDirectory": string — directory path relative to project root, WITHOUT filename.
   - "Description": string — brief description of what changed.
   - "Content": string — the COMPLETE file content, ready to copy-paste.

### JSON Formatting Rules (must follow):

1. **Content field escaping**: The "Content" value is a JSON string. You MUST escape:
   - All double quotes (\u0022) inside code as \\" or \\\\u0022
   - All backslashes inside code as \\\\
   - All newlines as \\n (literal line breaks inside JSON strings are NOT allowed)
   - All tabs as \\t
   - Example: if the file contains \`const msg = "hello";\`, write "Content": "const msg = \\"hello\\";\\n"

2. **No trailing commas**: Never put a comma after the last item in an object or array.
   - WRONG: { "a": 1, } or [ 1, 2, ]
   - RIGHT: { "a": 1 } or [ 1, 2 ]

3. **Split file paths correctly**: For a file shown as "--- File: components/ui/Button.tsx ---", set FileDirectory="components/ui" and FileName="Button.tsx". NEVER put the full path into FileName.

4. **Match the path format exactly** from the stashed context files. If the tree shows "modules/hello/world.tsx" (without "src/"), do NOT prepend "src/".

### Concrete Example:
\`\`\`json
{
  "AIMessage": "I added a Button component.",
  "FileContents": [
    {
      "FileName": "Button.tsx",
      "ExistingFile": true,
      "FileDirectory": "components/ui",
      "Description": "Added variant prop",
      "Content": "import React from 'react';\\n\\nexport function Button({ variant }: { variant: 'primary' | 'secondary' }) {\\n  return <button className={variant}>Click</button>;\\n}\\n"
    }
  ]
}
\`\`\`

### IMPORTANT:
- Before outputting, verify your JSON is valid (no trailing commas, all strings properly escaped).
- The "Content" field must contain the ENTIRE file — NOT a diff, snippet, or placeholder.
- Complete source code from first line to last, JSON-escaped.
`;
}
