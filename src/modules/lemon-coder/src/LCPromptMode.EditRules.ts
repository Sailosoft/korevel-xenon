// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCPromptMode.EditRules
// Shared OUTPUT RULES block for modes that generate file edits (Code, Agent).
// Kept in one place so the Code and Agent prompts cannot drift apart.
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Build the shared output-rules lines for edit-producing modes.
 *
 * The `Search` contract here is the short, anchor-based one: 1-3 lines whose
 * FIRST and LAST lines act as start/end anchors (matched by
 * `applySearchReplace` in useLCChat.ts). `Replace` covers the entire inclusive
 * region from the first anchor line through the last anchor line.
 */
export function buildEditOutputRules(): string[] {
  return [
    "### OUTPUT RULES",
    "",
    "Two modes for FileContents[] entries:",
    "",
    "A) NEW file: ExistingFile=false, provide full file in Content (JSON-escaped).",
    "",
    'B) EXISTING file: ExistingFile=true, provide Edits[] with SEARCH/REPLACE blocks. Set Content="" (empty string).',
    "",
    "Each Edits block:",
    '{ "Search": "anchor lines to find", "Replace": "new lines to write", "Description": "what changed" }',
    "",
    "Search rules:",
    "- 1-3 lines. The FIRST and LAST lines are anchors — keep each SHORT (30 characters or fewer where possible).",
    "- Copy the anchor lines character-perfect from the stashed file, including punctuation.",
    "- Do NOT include unchanged surrounding lines. Never paste a large block.",
    "- The anchors must be unique in the file; add a nearby line only if needed to disambiguate.",
    "",
    "Replace rules:",
    "- Replace = the new text for the ENTIRE region from the first anchor line through the last anchor line, inclusive.",
    "- For a single-line change, Search is that one line and Replace is the new line.",
    "- Description: 6 words or fewer.",
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
    "```json",
    "{",
    '  "AIMessage": "Added variant prop to Button.",',
    '  "FileContents": [',
    "    {",
    '      "FileName": "Button.tsx",',
    '      "ExistingFile": true,',
    '      "FileDirectory": "components/ui",',
    '      "Description": "Add variant prop",',
    '      "Content": "",',
    '      "Edits": [',
    "        {",
    '          "Description": "Add variant type",',
    '          "Search": "export function Button() {",',
    '          "Replace": "export function Button({ variant }: { variant: \'primary\' | \'secondary\' }) {"',
    "        }",
    "      ]",
    "    }",
    "  ]",
    "}",
    "```",
    "",
    "### Summary:",
    '- New file: Content with full file | Existing file: Edits[] + Content=""',
    "- Search = 1-3 anchor lines (first/last line short and unique). Replace the whole inclusive region.",
    "- Verify JSON is valid before responding.",
  ];
}
