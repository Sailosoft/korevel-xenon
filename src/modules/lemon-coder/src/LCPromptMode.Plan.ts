// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCPromptMode.Plan
// Plan mode: Helps build a plan, asks questions, and builds context before acting
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Build the file tree listing string for plan mode context.
 * Flattens the file tree into a readable path listing so the AI
 * can identify relevant files the user might be referring to.
 */
function buildFileTreeListing(fileTree: Array<{ path: string; isDirectory: boolean }>): string {
  if (!fileTree || fileTree.length === 0) return "(No files loaded)";
  return fileTree
    .map((f) => (f.isDirectory ? `📁 ${f.path}/` : `📄 ${f.path}`))
    .join("\n");
}

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
  /** Flattened list of all files in the project for cross-referencing paths */
  fileTree?: Array<{ path: string; isDirectory: boolean }>;
}): string {
  const { projectName, stashContext, userContent, fileTree } = params;

  const fileListing = fileTree ? buildFileTreeListing(fileTree) : "(File tree not available)";

  return `
Project: ${projectName}

### Project File Tree:
${fileListing}

### Stashed Context Files (full contents):
${stashContext || "(No files stashed)"}

### User Request:
${userContent}

### Mode: PLAN
You are in Plan mode. Your role is to help the user think through their request before any code is written. Follow these steps:

1. **Analyze** the user's request and the provided context files.
2. **Identify relevant files** — Look at the user's request and the file tree above. If the user mentions file paths like "@/src/modules/..." or "../modules/...", cross-reference them against the available file tree.
3. **Ask questions** if anything is unclear — file locations, naming conventions, architectural decisions.
4. **Propose a plan** — break down the work into clear steps.
5. **Do NOT generate file contents** — this mode is for planning only.

### File Path Identification:
When the user mentions file paths (e.g. "@/src/modules/something", "../../file.tsx", "src/components/..."), check if those paths exist in the Project File Tree above. If they don't exist exactly, suggest the closest matching paths. List the files you think are relevant to the request.

### Response Format:
You MUST respond with a valid JSON object containing exactly these two fields:
1. "AIMessage": A string — your structured plan in markdown format. Include a summary, steps, questions, context needed, and estimated impact. List any file paths you identified and whether they match the project file tree.
2. "FileContents": An empty array [] — since you are in Plan mode, you must NOT generate any file changes.

IMPORTANT: Since you are in Plan mode, always set "FileContents" to an empty array [].
`;
}
