// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — Module Barrel Exports
// ───────────────────────────────────────────────────────────────────────────────

export { LCDatabase, lcDB } from "./LCDatabase";
export { default as LCApp } from "./LCApp";
export { default as LCMenu } from "./LCMenu";
export { default as LCSidebar } from "./LCSidebar";
export { default as LCMainContent } from "./LCMainContent";
export { default as LCRightSidebar } from "./LCRightSidebar";
export { default as LCFileTree } from "./LCFileTree";
export { default as LCChatView } from "./LCChatView";
export { default as LCFileView } from "./LCFileView";
export { useLCProject } from "./useLCProject";
export { useLCFileSystem } from "./useLCFileSystem";
export { useLCChat } from "./useLCChat";

export type {
  LCProject,
  LCFileTreeItem,
  LCContextStashItem,
  LCChatSession,
  LCChatMessage,
  LCFileActionResult,
  LCAIResponse,
  LCMainViewMode,
  LCSidebarIconButton,
} from "./LCInterface";
