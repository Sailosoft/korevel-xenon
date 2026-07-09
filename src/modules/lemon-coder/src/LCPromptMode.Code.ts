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
You MUST respond with a valid JSON object containing these fields:
1. "AIMessage": A string — your explanation or response to the user.
2. "FileContents": An array of file objects (see below).

Each file object in "FileContents" supports TWO modes:

#### Mode A: Full file content (for NEW files or small files)
Use this when creating a new file or when the file is small (< ~100 lines).
Fields:
   - "FileName": string — ONLY the file name with extension.
   - "ExistingFile": boolean — true if the file already exists, false if new.
   - "FileDirectory": string — directory path relative to project root, WITHOUT filename.
   - "Description": string — brief description of what changed.
   - "Content": string — the COMPLETE file content, ready to copy-paste (JSON-escaped).

#### Mode B: SEARCH/REPLACE blocks (PREFERRED for existing files)
Use this when modifying an existing file — it is far more token-efficient.
Fields:
   - "FileName": string — ONLY the file name with extension.
   - "ExistingFile": boolean — true.
   - "FileDirectory": string — directory path relative to project root.
   - "Description": string — brief description of what changed.
   - "Content": string — the COMPLETE file content AFTER applying all edits (for display/diff).
   - "Edits": array of SEARCH/REPLACE blocks. Each block has:
       - "Search": string — exact content to find (MUST match the current file exactly, including whitespace and indentation).
       - "Replace": string — the new content to write in place of Search.
       - "Description": string (optional) — what this specific edit changes.

### Which mode to use:
| Scenario | Use |
|----------|-----|
| NEW file (doesn't exist yet) | Mode A (Content) — write the full file |
| EXISTING file, small change | Mode B (Edits) — 1-2 SEARCH/REPLACE blocks |
| EXISTING file, large refactor | Mode B (Edits) — multiple blocks |
| EXISTING file, < ~100 lines total | Either mode is fine |

### JSON Formatting Rules (must follow):

1. **Content/Edits field escaping**: String values in "Content", "Search", and "Replace" are JSON strings. You MUST escape:
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

5. **SEARCH must match exactly**: The "Search" string must be an EXACT match of the current file content — character for character, including whitespace and indentation. Copy the lines verbatim from the stashed context. If the SEARCH doesn't match, the edit will fail.

### Concrete Example:
\`\`\`json
{
  "AIMessage": "I added a Button component and updated the export.",
  "FileContents": [
    {
      "FileName": "Button.tsx",
      "ExistingFile": true,
      "FileDirectory": "components/ui",
      "Description": "Added variant prop using SEARCH/REPLACE",
      "Content": "import React from 'react';\\n\\nexport function Button({ variant }: { variant: 'primary' | 'secondary' }) {\\n  return <button className={variant}>Click</button>;\\n}\\n",
      "Edits": [
        {
          "Description": "Add variant type",
          "Search": "export function Button() {\\n  return <button>Click</button>;\\n}",
          "Replace": "export function Button({ variant }: { variant: 'primary' | 'secondary' }) {\\n  return <button className={variant}>Click</button>;\\n}"
        }
      ]
    }
  ]
}
\`\`\`

### IMPORTANT:
- Before outputting, verify your JSON is valid (no trailing commas, all strings properly escaped).
- When using Edits, also provide the complete "Content" of the file AFTER edits (for display/diff preview).
- The "Search" string must match the EXACT current content of the file — copy it directly from the stashed context.
- Keep SEARCH blocks focused: match enough context to be unique, but not the entire file.
- Complete source code from first line to last, JSON-escaped.
`;
}
