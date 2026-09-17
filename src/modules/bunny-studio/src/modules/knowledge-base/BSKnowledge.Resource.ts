// BSKnowledge.Resource — Resource file library for the Knowledge Base.
//
// Centralizes which files the "Resources" tab accepts (plain text and source
// code), how a file is classified (prose vs code), and the display language
// detected from its extension. Keeping the lists here means the file input, the
// validation, and the ingest flow all agree on one source of truth.

import type { BSKnowledgeResourceKind } from "./BSKnowledge.Types";

/** Prose / document extensions (chunked by paragraph, whitespace collapsed). */
export const RESOURCE_TEXT_EXTENSIONS = [
  ".txt",
  ".text",
  ".md",
  ".markdown",
  ".mdx",
  ".rst",
  ".log",
  ".csv",
  ".tsv",
] as const;

/** Source-code extensions (chunked by lines so indentation and structure survive). */
export const RESOURCE_CODE_EXTENSIONS = [
  // JavaScript / TypeScript
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  // C# / .NET
  ".cs",
  ".csx",
  // Web
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".html",
  ".htm",
  ".vue",
  ".svelte",
  ".astro",
  // Data / config / markup
  ".json",
  ".jsonc",
  ".xml",
  ".yaml",
  ".yml",
  ".toml",
  ".ini",
  ".cfg",
  ".env",
  ".properties",
  ".sql",
  ".graphql",
  ".gql",
  ".proto",
  // Other languages
  ".py",
  ".java",
  ".kt",
  ".kts",
  ".go",
  ".rs",
  ".rb",
  ".php",
  ".c",
  ".h",
  ".cpp",
  ".cc",
  ".cxx",
  ".hpp",
  ".hh",
  ".swift",
  ".m",
  ".mm",
  ".scala",
  ".lua",
  ".r",
  ".dart",
  ".pl",
  ".ex",
  ".exs",
  ".erl",
  ".clj",
  ".hs",
  ".jl",
  // Shell / tooling
  ".sh",
  ".bash",
  ".zsh",
  ".ps1",
  ".psm1",
  ".bat",
  ".cmd",
  ".gradle",
] as const;

/** Every extension accepted by the Resources tab (text + code). */
export const RESOURCE_FILE_EXTENSIONS = [
  ...RESOURCE_TEXT_EXTENSIONS,
  ...RESOURCE_CODE_EXTENSIONS,
] as const;

/** Map a code extension to a human-readable language label. */
export const RESOURCE_LANGUAGE_BY_EXTENSION: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "tsx",
  ".mts": "typescript",
  ".cts": "typescript",
  ".js": "javascript",
  ".jsx": "jsx",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".cs": "csharp",
  ".csx": "csharp",
  ".css": "css",
  ".scss": "scss",
  ".sass": "sass",
  ".less": "less",
  ".html": "html",
  ".htm": "html",
  ".vue": "vue",
  ".svelte": "svelte",
  ".astro": "astro",
  ".json": "json",
  ".jsonc": "jsonc",
  ".xml": "xml",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".toml": "toml",
  ".ini": "ini",
  ".cfg": "config",
  ".env": "dotenv",
  ".properties": "properties",
  ".sql": "sql",
  ".graphql": "graphql",
  ".gql": "graphql",
  ".proto": "protobuf",
  ".py": "python",
  ".java": "java",
  ".kt": "kotlin",
  ".kts": "kotlin",
  ".go": "go",
  ".rs": "rust",
  ".rb": "ruby",
  ".php": "php",
  ".c": "c",
  ".h": "c",
  ".cpp": "cpp",
  ".cc": "cpp",
  ".cxx": "cpp",
  ".hpp": "cpp",
  ".hh": "cpp",
  ".swift": "swift",
  ".m": "objective-c",
  ".mm": "objective-c",
  ".scala": "scala",
  ".lua": "lua",
  ".r": "r",
  ".dart": "dart",
  ".pl": "perl",
  ".ex": "elixir",
  ".exs": "elixir",
  ".erl": "erlang",
  ".clj": "clojure",
  ".hs": "haskell",
  ".jl": "julia",
  ".sh": "shell",
  ".bash": "shell",
  ".zsh": "shell",
  ".ps1": "powershell",
  ".psm1": "powershell",
  ".bat": "batch",
  ".cmd": "batch",
  ".gradle": "gradle",
};

/** The lowercased extension of a file name (including the leading dot). */
export function getResourceExtension(fileName: string): string {
  const lower = fileName.toLowerCase();
  const dot = lower.lastIndexOf(".");
  // Dotfiles like ".env" have no trailing extension — the whole name is it.
  if (dot === 0) return lower.length > 1 ? lower : "";
  return dot < 0 ? "" : lower.slice(dot);
}

/** Whether a file is accepted by the Resources tab (text or code). */
export function isAllowedResourceFile(file: File): boolean {
  const ext = getResourceExtension(file.name);
  return (RESOURCE_FILE_EXTENSIONS as readonly string[]).includes(ext);
}

/** Whether a file is source code (as opposed to prose text). */
export function isCodeResourceFile(fileName: string): boolean {
  const ext = getResourceExtension(fileName);
  return (RESOURCE_CODE_EXTENSIONS as readonly string[]).includes(ext);
}

/** Classify a resource file as prose "text" or source "code". */
export function getResourceKind(fileName: string): BSKnowledgeResourceKind {
  return isCodeResourceFile(fileName) ? "code" : "text";
}

/** Detect the display language of a code file from its extension. */
export function getResourceLanguage(fileName: string): string | undefined {
  return RESOURCE_LANGUAGE_BY_EXTENSION[getResourceExtension(fileName)];
}

/** Build the `accept` attribute for the resource file input. */
export function buildResourceAccept(): string {
  return RESOURCE_FILE_EXTENSIONS.join(",");
}
