// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — Interfaces & Types
// ───────────────────────────────────────────────────────────────────────────────

/** A saved project reference */
export interface LCProject {
  id: string;
  name: string;
  folderPath: string;
  lastOpened: Date;
  createdAt: Date;
}

/**
 * A serialised FileSystemDirectoryHandle cached in IndexedDB.
 * Handles are structured-clonable, so we store them directly in a dedicated table.
 */
export interface LCProjectHandle {
  /** Matches LCProject.id */
  projectId: string;
  /** The root directory handle for this project */
  dirHandle: FileSystemDirectoryHandle;
  /** When this handle was last verified to have valid permission */
  lastVerified: Date;
}

/** A single item in the file tree */
export interface LCFileTreeItem {
  id: string;
  name: string;
  path: string;
  isDirectory: boolean;
  children?: LCFileTreeItem[];
  expanded?: boolean;
}

/** A file or folder stashed into the context sidebar */
export interface LCContextStashItem {
  id: string;
  name: string;
  path: string;
  isDirectory: boolean;
  addedAt: Date;
  /** If this item is a child of a folder group, references the parent folder's stash id */
  parentId?: string;
}

/** A chat session */
export interface LCChatSession {
  id: string;
  projectId: string;
  title: string;
  messages: LCChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

/** Error information attached to a failed message */
export interface LCErrorInfo {
  /** The error message string */
  message: string;
  /** Optional stack trace */
  stack?: string;
  /** The error name/type (e.g. "Error", "TypeError", "APIError") */
  name?: string;
  /** Timestamp when the error occurred */
  timestamp: Date;
  /** The user's original content that failed (for retry) */
  failedContent?: string;
}

/** A single message in a chat session */
export interface LCChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  fileContents?: LCFileActionResult[];
  /** Error details if this message represents a failed AI response */
  error?: LCErrorInfo;
  /** Selectable question/option bubbles from Plan mode */
  questions?: string[];
  /** File names from the context stash that were attached when this message was sent */
  contextFiles?: string[];
}

/** Status of a file diff application */
export type LCApplyStatus = "apply" | "applying" | "applied";

/** AI response containing file actions */
export interface LCFileActionResult {
  FileName: string;
  ExistingFile: boolean;
  FileDirectory: string;
  Description: string;
  Content: string;
  /** SEARCH/REPLACE edits (alternative to Content for existing files) */
  Edits?: LCFileEdit[];
  /** Track the application status of this file action */
  applyStatus?: LCApplyStatus;
}

/**
 * A single SEARCH/REPLACE block targeting a section of a file.
 * The AI matches `Search` exactly (including whitespace/indentation) and
 * replaces it with `Replace`. Multiple edits can be applied to the same file.
 *
 * When Edits[] is present, `Content` is the *target* (post-apply) content
 * used for display/diff, but the actual write uses the SEARCH/REPLACE blocks.
 */
export interface LCFileEdit {
  /** Brief description of what this edit changes */
  Description?: string;
  /** Exact content to find in the current file (must match line-for-line) */
  Search: string;
  /** Replacement content that will be written in place of Search */
  Replace: string;
}

/** AI response structure from Helix */
export interface LCAIResponse {
  SessionID: string;
  AIMessage: string;
  FileContents: LCFileActionResult[];
  /** Alternative: top-level FileEdits grouped by file (simpler than FileContents for edits) */
  FileEdits?: Array<{
    FileName: string;
    FileDirectory: string;
    Description?: string;
    Edits: LCFileEdit[];
  }>;
  /** Selectable question/option suggestions (Plan mode) */
  Questions?: string[];
}

/** A single message in the AI conversation array for multi-turn chat */
export interface LCAIConversationMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Tracking info for external file change detection */
export interface LCExternalChangeRecord {
  path: string;
  /** Timestamp from File.lastModified when we last read the file */
  lastKnownModified: number;
  /** Whether the editor content differs from what was last read from disk */
  isEditorDirty: boolean;
}

/** Status of the active file's external change state */
export interface LCExternalChangeStatus {
  /** Whether the currently open file was modified externally */
  hasExternalChange: boolean;
  /** The File.lastModified timestamp from disk (if available) */
  diskLastModified: number | null;
}

/** View mode for the main content area */
export type LCMainViewMode = "chat" | "file" | "diff";

/** Represents a diff preview between original file content and AI-generated content */
export interface LCDiffPreview {
  /** The AI-generated file action */
  fileAction: LCFileActionResult;
  /** The original file content read from disk (empty string for new files) */
  originalContent: string;
  /** The full path for display */
  filePath: string;
}

/** Sidebar icon button definition */
export interface LCSidebarIconButton {
  id: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

// ── Path Resolution ───────────────────────────────────────────────────────────

/**
 * Resolve the full file path from an LCFileActionResult, normalising AI
 * misformatting where `FileName` may contain a full relative path instead of
 * just the filename, or where `FileDirectory` already embeds the filename.
 *
 * Handles these AI output patterns:
 *
 *   Correct:   { FileDirectory:"src/hello", FileName:"world.tsx" }
 *              → "src/hello/world.tsx"
 *
 *   FileName with path:   { FileDirectory:"src/hello", FileName:"src/hello/world.tsx" }
 *              → "src/hello/world.tsx"          (extra dir overlaps FileDirectory)
 *
 *   Complementary:   { FileDirectory:"src", FileName:"hello/world.tsx" }
 *              → "src/hello/world.tsx"          (extra dir merged into FileDirectory)
 *
 *   No directory:   { FileDirectory:"", FileName:"src/hello/world.tsx" }
 *              → "src/hello/world.tsx"          (entire path from FileName)
 *
 *   FileDirectory is bloated:   { FileDirectory:"src/hello/world.tsx", FileName:"world.tsx" }
 *              → "src/hello/world.tsx"          (FileDirectory truncated)
 */
export function resolveFilePath(action: {
  FileDirectory: string;
  FileName: string;
}): string {
  let { FileDirectory, FileName } = action;

  // Normalise backslashes to forward slashes
  FileName = FileName.replace(/\\/g, "/");
  FileDirectory = (FileDirectory ?? "").replace(/\\/g, "/");

  // Strip leading slashes from both parts (AI may return "/src/hello" or "/world.tsx")
  FileDirectory = FileDirectory.replace(/^\/+/, "");
  FileName = FileName.replace(/^\/+/, "");

  // Strip trailing slashes from FileDirectory
  FileDirectory = FileDirectory.replace(/\/+$/, "");

  // Case A: FileDirectory already contains the full path including FileName
  if (FileDirectory && FileDirectory.endsWith(`/${FileName}`)) {
    return FileDirectory.replace(/\/+/g, "/");
  }

  // Case B: FileName contains a path separator (AI put the full path here)
  if (FileName.includes("/")) {
    const parts = FileName.split("/");
    const justName = parts.pop()!;
    const extraDir = parts.join("/");

    if (FileDirectory) {
      // Check if FileDirectory already ends with the extra directory
      // (overlap/duplication — e.g. FileDirectory="src/hello", FileName="src/hello/world.tsx")
      if (FileDirectory.endsWith(extraDir)) {
        FileName = justName;
      } else {
        // Complementary paths — merge them
        FileDirectory = `${FileDirectory}/${extraDir}`.replace(/\/+/g, "/");
        FileName = justName;
      }
    } else {
      // No FileDirectory — use the path from FileName
      FileDirectory = extraDir;
      FileName = justName;
    }
  }

  if (!FileDirectory) return FileName;
  return `${FileDirectory}/${FileName}`.replace(/\/+/g, "/");
}

// ── Favorite Groups & Items ──────────────────────────────────────────────────

/** A group that organises favourite files */
export interface LCFavoriteGroup {
  id: string;
  projectId: string;
  name: string;
  createdAt: Date;
}

/** A single file marked as favourite, belonging to a group */
export interface LCFavoriteItem {
  id: string;
  groupId: string;
  projectId: string;
  name: string;
  path: string;
  addedAt: Date;
}

/** The default group name used when no group is selected */
export const DEFAULT_FAVORITE_GROUP_NAME = "Default";

// ── Settings ──────────────────────────────────────────────────────────────────

/**
 * A single key-value settings entry persisted in DexieDB.
 */
export interface LCSettingsEntry {
  key: string;
  value: string;
  updatedAt: Date;
}

/**
 * Definition of a single setting field displayed in the settings modal.
 */
export interface LCSettingsField {
  /** Unique key used to store/retrieve the value in DexieDB */
  key: string;
  /** Human-readable label */
  label: string;
  /** Optional description shown below the label */
  description?: string;
  /** The input control type */
  type: "text" | "textarea" | "boolean" | "select" | "number";
  /** Default value if no stored value exists */
  defaultValue: string;
  /** Options for "select" type */
  options?: { label: string; value: string }[];
}

/**
 * All available settings fields for the Lemon Coder settings modal.
 * Add new entries here to register a new setting.
 */
export const LC_SETTINGS_FIELDS: LCSettingsField[] = [
  {
    key: "editor.wordWrap",
    label: "Word Wrap",
    description: "Wrap lines in the editor. Markdown files always wrap regardless of this setting.",
    type: "boolean",
    defaultValue: "true",
  },
  {
    key: "editor.fontSize",
    label: "Font Size",
    description: "Monaco editor font size in pixels.",
    type: "number",
    defaultValue: "13",
  },
  {
    key: "editor.tabSize",
    label: "Tab Size",
    description: "Number of spaces per indentation level.",
    type: "number",
    defaultValue: "2",
  },
  {
    key: "editor.minimap",
    label: "Minimap",
    description: "Show the minimap in the editor.",
    type: "boolean",
    defaultValue: "true",
  },
];

// ── Deepstash ─────────────────────────────────────────────────────────────────

/**
 * A saved snapshot of the context stash (a "Deepstash"), linked to a project.
 * The user can save, load (pop), merge (apply), or overwrite stash snapshots.
 */
export interface LCDeepstash {
  id: string;
  projectId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

/** A single item within a deepstash snapshot */
export interface LCDeepstashItem {
  id: string;
  deepstashId: string;
  name: string;
  path: string;
  isDirectory: boolean;
  /** If this item is a child of a folder group, references the parent item's id */
  parentId?: string;
  addedAt: Date;
}

/** A single instruction snippet stored in the instruction stash */
export interface LCInstructionStashItem {
  id: string;
  name: string;
  content: string;
  addedAt: Date;
}

/** Merge strategy when applying a deepstash to the current context stash */
export type LCDeepstashMergeStrategy = "override" | "overlap";
