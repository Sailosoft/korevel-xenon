// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCApp Main Component
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useCallback, useRef } from "react";
import { directoryOpen } from "browser-fs-access";
import { useLiveQuery } from "dexie-react-hooks";
import { lcDB } from "./LCDatabase";
import { useLCProject } from "./useLCProject";
import { useLCFileSystem } from "./useLCFileSystem";
import { useLCChat } from "./useLCChat";
import LCMenu from "./LCMenu";
import LCSidebar from "./LCSidebar";
import LCMainContent from "./LCMainContent";
import LCRightSidebar from "./LCRightSidebar";
import LCHelixConfigModal from "./LCHelixConfigModal";
import LCLandingScreen from "./LCLandingScreen";
import LCNewItemModal from "./LCNewItemModal";
import type {
  LCProject,
  LCFileTreeItem,
  LCContextStashItem,
  LCChatSession,
  LCFileActionResult,
} from "./LCInterface";
import { LCTheme } from "./LCTheme";

export default function LCApp() {
  const {
    currentProject,
    recentProjects,
    isLoading: isProjectLoading,
    openProject,
    openProjectFromHandle,
    selectRecentProject,
    selectRecentProjectNoHandle,
    clearRecentProjects,
  } = useLCProject();

  const {
    fileTree,
    selectedFile,
    selectedFileContent,
    isDirty,
    isLoading: isFileTreeLoading,
    externalChangeStatus,
    loadDirectory,
    loadFromCachedHandle,
    requestHandlePermission,
    selectFile,
    toggleExpand,
    addToStash,
    removeFromStash,
    clearStash,
    setSelectedFileContent,
    findItemByPath,
    readFileContent,
    refreshFileTree,
    reloadActiveFile,
    acknowledgeExternalChange,
    saveFile,
    writeFile,
    createItem,
  } = useLCFileSystem();

  const {
    sessions,
    activeSession,
    messages,
    isSending,
    createSession: createChatSession,
    selectSession,
    sendMessage,
    applyFileChanges,
  } = useLCChat();

  const [isRightSidebarExpanded, setIsRightSidebarExpanded] = useState(true);
  const [isHelixConfigOpen, setIsHelixConfigOpen] = useState(false);
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [newFileParentPath, setNewFileParentPath] = useState("");
  const [newFileType, setNewFileType] = useState<"file" | "directory">("file");
  const isOpeningRef = useRef(false);

  // Live query for stash items
  const stashItems =
    useLiveQuery(() => lcDB.getStashItems()) || [];

  // Live query for chat sessions
  const chatSessions =
    useLiveQuery(
      () => (currentProject ? lcDB.getChatSessions(currentProject.id) : []),
      [currentProject?.id],
    ) || [];

  /**
   * Extract the root FileSystemDirectoryHandle from a directoryOpen() result.
   * - Empty dirs: directoryOpen returns [handle] — the handle itself.
   * - Non-empty dirs: returns File[] — root-level files have .directoryHandle
   *   pointing to the root directory handle.
   *
   * NOTE: Root-level files (direct children of the selected directory) have
   *       webkitRelativePath with 1 segment (e.g. "file.txt"), NOT 2 segments.
   *       Files with 2 segments (e.g. "subdir/file.txt") are one level deep,
   *       and their directoryHandle points to the subdirectory, not the root.
   */
  const extractRootHandle = useCallback(
    (result: any): FileSystemDirectoryHandle => {
      if (!result || result.length === 0) {
        throw new Error("No files or handle returned from directory picker");
      }

      const first = result[0];

      // Empty directory case: result is [FileSystemDirectoryHandle]
      if (first && typeof first.kind === "string" && first.kind === "directory") {
        return first as FileSystemDirectoryHandle;
      }

      // Non-empty directory case: result is FileWithDirectoryAndFileHandle[]
      // Root-level files (direct children of the selected dir) have
      // webkitRelativePath = "filename" (1 segment — no slash).
      // Their directoryHandle IS the root handle.
      const rootLevelFile = result.find(
        (f: any) =>
          f.directoryHandle &&
          (!f.webkitRelativePath || f.webkitRelativePath.split("/").length === 1),
      );
      if (rootLevelFile?.directoryHandle) {
        return rootLevelFile.directoryHandle as FileSystemDirectoryHandle;
      }

      // Fallback: use the first file's directoryHandle.
      // NOTE: When the selected directory contains only subdirectories
      // (no root-level files), this handle may point to a subdirectory,
      // not the root. Use showDirectoryPicker() as a more reliable
      // alternative when possible (see handleOpenFolder).
      if (first?.directoryHandle) {
        return first.directoryHandle as FileSystemDirectoryHandle;
      }

      throw new Error("Could not obtain directory handle from selected folder");
    },
    [],
  );

  const handleOpenFolder = useCallback(async (createProjectEntry = true) => {
    // Prevent concurrent directory picker invocations
    if (isOpeningRef.current) return;
    isOpeningRef.current = true;
    try {
      let dirHandle: FileSystemDirectoryHandle;

      // Try the native File System Access API directly first.
      // This is more reliable than extracting the root handle from
      // browser-fs-access's directoryOpen() result, which can return
      // a subdirectory handle when the selected folder contains only
      // subdirectories (no root-level files).
      if (typeof (window as any).showDirectoryPicker === "function") {
        dirHandle = await (window as any).showDirectoryPicker({
          mode: "readwrite",
        });
      } else {
        // Fallback: use browser-fs-access for older browsers
        const result = await directoryOpen({
          recursive: true,
          mode: "readwrite",
        });
        dirHandle = extractRootHandle(result);
      }

      // Clear context stash before loading new project
      await clearStash();
      await loadDirectory(dirHandle);

      // Create project entry only when opening a brand-new project,
      // and cache the directory handle for future auto-load
      if (createProjectEntry) {
        await openProjectFromHandle(dirHandle.name, dirHandle);
      }
    } catch (error: any) {
      if (error.name !== "AbortError" && error.name !== "SecurityError") {
        console.error("Failed to open folder:", error);
      }
    } finally {
      isOpeningRef.current = false;
    }
  }, [loadDirectory, openProjectFromHandle, clearStash, extractRootHandle]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!currentProject) return;

      // Build the send options with the file-reader for stash context
      const sendOptions = {
        readFileContent: async (filePath: string) => {
          const item = findItemByPath(filePath);
          if (!item) throw new Error(`File not found in tree: ${filePath}`);
          // readFileContent expects a tree item, but we need one by path
          // Re-use selectFile's logic — use findItemByPath to get the item
          return readFileContent(item);
        },
      };

      // Create session if none exists and send with sessionOverride to avoid stale closure
      if (!activeSession) {
        const newSession = await createChatSession(currentProject.id);
        await sendMessage(content, stashItems, currentProject.name, {
          ...sendOptions,
          sessionOverride: newSession,
        });
      } else {
        await sendMessage(content, stashItems, currentProject.name, sendOptions);
      }
    },
    [currentProject, activeSession, createChatSession, sendMessage, stashItems, findItemByPath, readFileContent],
  );

  /**
   * Apply file changes by writing AI-generated content directly to disk
   * using the File System Access API (via useLCFileSystem.writeFile).
   * Falls back to the download-blob approach from useLCChat.applyFileChanges
   * if writeFile is unavailable. Refreshes the file tree afterward so new
   * files appear immediately.
   */
  const handleApplyFileChanges = useCallback(
    async (fileActions: LCFileActionResult[]) => {
      for (const action of fileActions) {
        try {
          const filePath = action.FileDirectory
            ? `${action.FileDirectory}/${action.FileName}`.replace(/\/+/g, "/")
            : action.FileName;

          // Write directly to the filesystem via the cached directory handle
          await writeFile(filePath, action.Content);

          console.log(
            `[lemon-coder] ${action.ExistingFile ? "Overwritten" : "Created"} file: ${filePath}`,
          );
        } catch (error) {
          console.error(
            `[lemon-coder] Failed to write ${action.FileName}, falling back to download:`,
            error,
          );

          // Fallback: browser download via blob URL
          const blob = new Blob([action.Content], { type: "text/plain" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = action.FileName;
          a.click();
          URL.revokeObjectURL(url);
        }
      }

      // Refresh the file tree so new files appear immediately
      await refreshFileTree();
    },
    [writeFile, refreshFileTree],
  );

  const handleKeepOnlyFolder = useCallback(
    async (folderId: string) => {
      // Remove all child items of this folder from the stash,
      // keeping only the folder reference itself.
      const children = stashItems.filter((s) => s.parentId === folderId);
      for (const child of children) {
        await removeFromStash(child.id);
      }
    },
    [stashItems, removeFromStash],
  );

  const handleStashItemClick = useCallback(
    (item: LCContextStashItem) => {
      if (!item.isDirectory) {
        const treeItem = findItemByPath(item.path);
        if (treeItem) {
          selectFile(treeItem);
        }
      }
    },
    [findItemByPath, selectFile],
  );

  const handleCreateSession = useCallback(() => {
    if (currentProject) {
      // Clear context stash for a fresh context
      clearStash();
      createChatSession(currentProject.id);
    }
  }, [currentProject, createChatSession, clearStash]);

  const handleSelectRecentProject = useCallback(
    async (id: string) => {
      const project = recentProjects.find((p) => p.id === id);
      if (!project) return;

      // Step 1: Select the project (sets as current, updates lastOpened)
      // The project ID is preserved in Dexie regardless of permission state.
      await selectRecentProject(project);

      // Step 2: Try to restore the cached handle
      const cached = await lcDB.getProjectHandle(project.id);
      if (!cached?.dirHandle) {
        // No cached handle — just selected, user can click "Open Folder" later
        return;
      }

      // Step 3: Request permission directly (within the user gesture).
      // This runs BEFORE any other async ops that could exhaust the activation.
      const granted = await requestHandlePermission(cached.dirHandle);
      if (granted) {
        await clearStash();
        await loadDirectory(cached.dirHandle);
      } else {
        // Permission denied — user can try again via "Open Folder"
        console.log(
          "[lemon-coder] Cached handle permission denied for",
          project.name,
          "— user can re-select the folder.",
        );
      }
    },
    [recentProjects, selectRecentProject, requestHandlePermission, loadDirectory, clearStash],
  );

  // Landing screen when no project is selected
  if (!currentProject) {
    return (
      <>
        <LCLandingScreen
          onOpenProject={() => handleOpenFolder()}
          recentProjects={recentProjects}
          onSelectRecentProject={handleSelectRecentProject}
          onOpenHelixConfig={() => setIsHelixConfigOpen(true)}
          onClearRecentProjects={clearRecentProjects}
        />

        {/* Helix AI Config Modal */}
        <LCHelixConfigModal
          isOpen={isHelixConfigOpen}
          onOpenChange={setIsHelixConfigOpen}
        />
      </>
    );
  }

  // Main workspace view
  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ backgroundColor: LCTheme.colors.background, color: LCTheme.colors.text }}
    >
      {/* Top Menu — "New Session" now creates a new chat session instead of resetting the project */}
      <LCMenu
        onOpenProject={() => handleOpenFolder()}
        onNewSession={handleCreateSession}
        onOpenHelixConfig={() => setIsHelixConfigOpen(true)}
        projectName={currentProject.name}
        recentProjects={recentProjects}
        onSelectRecentProject={handleSelectRecentProject}
      />

      {/* Main Layout: Sidebar | Content | RightSidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar (Icon Bar + File Tree) */}
        <LCSidebar
          fileTreeItems={fileTree}
          selectedFile={selectedFile}
          isFileTreeLoading={isFileTreeLoading}
          onSelectFile={selectFile}
          onToggleExpand={toggleExpand}
          onAddToStash={addToStash}
          onRefreshFileTree={refreshFileTree}
          onNewItem={(parentPath, type) => {
            setNewFileParentPath(parentPath);
            setNewFileType(type);
            setIsNewItemModalOpen(true);
          }}
        />

        {/* Main Content */}
        <LCMainContent
          selectedFile={selectedFile}
          selectedFileContent={selectedFileContent}
          isDirty={isDirty}
          messages={messages}
          stashItems={stashItems}
          isSending={isSending}
          onSendMessage={handleSendMessage}
          onApplyFileChanges={handleApplyFileChanges}
          onContentChange={setSelectedFileContent}
          externalChangeStatus={externalChangeStatus}
          onReloadFromDisk={reloadActiveFile}
          onAcknowledgeExternalChange={acknowledgeExternalChange}
          onSave={saveFile}
          onReadFileContent={async (filePath: string) => {
            const item = findItemByPath(filePath);
            if (!item) throw new Error(`File not found: ${filePath}`);
            return readFileContent(item);
          }}
        />

        {/* Right Sidebar */}
        <LCRightSidebar
          stashItems={stashItems}
          chatSessions={chatSessions}
          activeSessionId={activeSession?.id || null}
          onRemoveFromStash={removeFromStash}
          onClearStash={clearStash}
          onStashItemClick={handleStashItemClick}
          onSelectSession={selectSession}
          onCreateSession={handleCreateSession}
          isExpanded={isRightSidebarExpanded}
          onToggleExpand={() =>
            setIsRightSidebarExpanded(!isRightSidebarExpanded)
          }
          onKeepOnlyFolder={handleKeepOnlyFolder}
        />
      </div>

      {/* Helix AI Config Modal */}
      <LCHelixConfigModal
        isOpen={isHelixConfigOpen}
        onOpenChange={setIsHelixConfigOpen}
      />

      {/* New File/Folder Modal */}
      <LCNewItemModal
        isOpen={isNewItemModalOpen}
        onOpenChange={setIsNewItemModalOpen}
        onCreate={(name, type) => {
          createItem(newFileParentPath, name, type);
        }}
        defaultPath={newFileParentPath}
        defaultType={newFileType}
      />
    </div>
  );
}
