// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCApp Main Component
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useCallback, useRef } from "react";
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

export default function LCApp() {
  const {
    currentProject,
    recentProjects,
    isLoading: isProjectLoading,
    openProject,
    selectRecentProject,
  } = useLCProject();

  const {
    fileTree,
    selectedFile,
    selectedFileContent,
    isLoading: isFileTreeLoading,
    externalChangeStatus,
    loadDirectory,
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

  const handleOpenFolder = useCallback(async (createProjectEntry = true) => {
    // Prevent concurrent directory picker invocations
    if (isOpeningRef.current) return;
    isOpeningRef.current = true;
    try {
      const dirHandle = await (window as any).showDirectoryPicker();
      // Clear context stash before loading new project
      await clearStash();
      await loadDirectory(dirHandle);
      // Create project entry only when opening a brand-new project
      if (createProjectEntry) {
        await openProject(dirHandle.name);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Failed to open folder:", error);
      }
    } finally {
      isOpeningRef.current = false;
    }
  }, [loadDirectory, openProject, clearStash]);

  const handleSendMessage = useCallback(
    (content: string) => {
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

      // Create session if none exists
      if (!activeSession) {
        createChatSession(currentProject.id).then(() => {
          // Small delay to ensure session is created
          setTimeout(() => {
            sendMessage(content, stashItems, currentProject.name, sendOptions);
          }, 100);
        });
      } else {
        sendMessage(content, stashItems, currentProject.name, sendOptions);
      }
    },
    [currentProject, activeSession, createChatSession, sendMessage, stashItems, findItemByPath, readFileContent],
  );

  /**
   * Apply file changes by writing AI-generated content directly to disk
   * using the File System Access API (via useLCFileSystem.writeFile).
   * Falls back to the download-blob approach from useLCChat.applyFileChanges
   * if writeFile is unavailable.
   */
  const handleApplyFileChanges = useCallback(
    async (fileActions: LCFileActionResult[]) => {
      for (const action of fileActions) {
        try {
          const filePath = action.FileDirectory
            ? `${action.FileDirectory}/${action.FileName}`
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
    },
    [writeFile],
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
      if (project) {
        await selectRecentProject(project);
        // The user can click "Open Project" to load the folder file tree
      }
    },
    [recentProjects, selectRecentProject],
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
        />

        {/* Helix AI Config Modal */}
        <LCHelixConfigModal
          open={isHelixConfigOpen}
          onOpenChange={setIsHelixConfigOpen}
        />
      </>
    );
  }

  // Main workspace view
  return (
    <div className="flex flex-col h-screen bg-[#1e1e1e] text-[#d4d4d4] overflow-hidden">
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
          onNewItem={(parentPath) => {
            setNewFileParentPath(parentPath);
            setIsNewItemModalOpen(true);
          }}
        />

        {/* Main Content */}
        <LCMainContent
          selectedFile={selectedFile}
          selectedFileContent={selectedFileContent}
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
        />
      </div>

      {/* Helix AI Config Modal */}
      <LCHelixConfigModal
        open={isHelixConfigOpen}
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
      />
    </div>
  );
}
