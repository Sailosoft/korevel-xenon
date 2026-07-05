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
  /** Track the application status of this file action */
  applyStatus?: LCApplyStatus;
}

/** AI response structure from Helix */
export interface LCAIResponse {
  SessionID: string;
  AIMessage: string;
  FileContents: LCFileActionResult[];
  /** Selectable question/option suggestions (Plan mode) */
  Questions?: string[];
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
