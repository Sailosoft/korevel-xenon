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

/** A single message in a chat session */
export interface LCChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  fileContents?: LCFileActionResult[];
}

/** AI response containing file actions */
export interface LCFileActionResult {
  FileName: string;
  ExistingFile: boolean;
  FileDirectory: string;
  Description: string;
  Content: string;
}

/** AI response structure from Helix */
export interface LCAIResponse {
  SessionID: string;
  AIMessage: string;
  FileContents: LCFileActionResult[];
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
