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

  return [
    "Project: " + projectName,
    "",
    "### Stashed Context:",
    stashContext || "(None)",
    "",
    "### Instruction:",
    userContent,
    "",
    "### OUTPUT RULES",
    "",
    "Two modes for FileContents[] entries:",
    "",
    "A) NEW file: ExistingFile=false, provide full file in Content (JSON-escaped).",
    "",
    "B) EXISTING file: ExistingFile=true, provide Edits[] with SEARCH/REPLACE blocks. Set Content=\"\" (empty string).",
    "",
    "Each Edits block:",
    '{ "Search": "exact lines to find", "Replace": "new lines to write", "Description": "what changed" }',
    "",
    "Search rules:",
    "- Must EXACTLY match current file (copy from stashed context). Character-perfect including whitespace.",
    "- 3-10 lines per block. Keep small.",
    "- Must be UNIQUE in the file (appear only once). Include surrounding lines to disambiguate.",
    "",
    "### JSON rules:",
    "Use \\n for newlines, \\\" for double quotes inside strings.",
    "Do NOT double-escape: write \\n not \\\\n. Write \\\" not \\\\\\\".",
    "No trailing commas. WRONG: [1,2,] RIGHT: [1,2]",
    "",
    "### File paths:",
    "- FileDirectory = dir WITHOUT filename. FileName = name only.",
    "- Match casing and prefix from stashed context exactly.",
    "",
    "### Example (existing file with Edits):",
    '```json',
    "{",
    '  "AIMessage": "Added variant prop to Button.",',
    '  "FileContents": [',
    "    {",
    '      "FileName": "Button.tsx",',
    '      "ExistingFile": true,',
    '      "FileDirectory": "components/ui",',
    '      "Description": "Added variant prop",',
    '      "Content": "",',
    '      "Edits": [',
    "        {",
    '          "Description": "Add variant type",',
    '          "Search": "export function Button() {\\n  return <button>Click</button>;\\n}",',
    '          "Replace": "export function Button({ variant }: { variant: \'primary\' | \'secondary\' }) {\\n  return <button className={variant}>Click</button>;\\n}"',
    "        }",
    "      ]",
    "    }",
    "  ]",
    "}",
    '```',
    "",
    "### Summary:",
    "- New file: Content with full file | Existing file: Edits[] + Content=\"\"",
    "- Search must match EXACTLY. 3-10 lines per block. Unique in file.",
    "- Verify JSON is valid before responding.",
  ].join("\n");
}
