// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCStudio Component
// Main workspace view shown when a project is loaded (the "studio" experience)
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Modal, Button } from "@heroui/react";
import { lcDB } from "./LCDatabase";
import { getHandle, removeHandle } from "./LCHandleRegistry";
import { useLCProject } from "./useLCProject";
import { useLCFileSystem } from "./useLCFileSystem";
import { useLCChat } from "./useLCChat";
import LCMenu from "./LCMenu";
import LCSidebar from "./LCSidebar";
import LCMainContent from "./LCMainContent";
import LCRightSidebar from "./LCRightSidebar";
import LCHelixConfigModal from "./LCHelixConfigModal";
import LCNewItemModal from "./LCNewItemModal";
import type {
  LCProject,
  LCFileTreeItem,
  LCContextStashItem,
  LCChatSession,
  LCFileActionResult,
} from "./LCInterface";
import { LCTheme } from "./LCTheme";

interface LCStudioProps {
  projectId: string;
}

export default function LCStudio({ projectId }: LCStudioProps) {
  const router = useRouter();
  const [currentProject, setCurrentProject] = useState<LCProject | null>(null);
  const [isProjectLoading, setIsProjectLoading] = useState(true);

  // Load the project from Dexie on mount
  useEffect(() => {
    let cancelled = false;
    async function loadProject() {
      try {
        const project = await lcDB.getProject(projectId);
        if (!cancelled) {
          setCurrentProject(project ?? null);
        }
      } catch (error) {
        console.error("[lemon-coder] Failed to load project:", error);
      } finally {
        if (!cancelled) setIsProjectLoading(false);
      }
    }
    loadProject();
    return () => { cancelled = true; };
  }, [projectId]);

  const {
    recentProjects,
    openProjectFromHandle,
    selectRecentProject,
    selectRecentProjectNoHandle,
    isLoading: isRecentLoading,
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
  const [isLeaveStudioOpen, setIsLeaveStudioOpen] = useState(false);
  const [newFileParentPath, setNewFileParentPath] = useState("");
  const [newFileType, setNewFileType] = useState<"file" | "directory">("file");
  const [permissionExpired, setPermissionExpired] = useState(false);
  const cachedDirHandleRef = useRef<FileSystemDirectoryHandle | null>(null);

  // Live query for stash items
  const stashItems =
    useLiveQuery(() => lcDB.getStashItems()) || [];

  // Live query for chat sessions
  const chatSessions =
    useLiveQuery(
      () => (currentProject ? lcDB.getChatSessions(currentProject.id) : []),
      [currentProject?.id],
    ) || [];

  // Attempt to restore the directory handle when project loads.
  // Uses only queryPermission() (safe outside user gesture).
  // If permission is not already granted, stores the handle in a ref
  // and sets permissionExpired so the UI can show a reconnect button.
  useEffect(() => {
    if (!currentProject) return;

    let cancelled = false;
    async function restoreHandle() {
      try {
        // Priority 1: In-memory registry (handle from the directory picker,
        // passed across the landing → studio navigation without Dexie serialization)
        const registeredHandle = getHandle(currentProject!.id);
        if (registeredHandle) {
          removeHandle(currentProject!.id);
          await clearStash();
          await loadDirectory(registeredHandle);
          setPermissionExpired(false);
          cachedDirHandleRef.current = null;
          return;
        }

        // Priority 2: Dexie-cached handle (for page refreshes / direct URL access)
        const cached = await lcDB.getProjectHandle(currentProject!.id);
        if (cancelled || !cached?.dirHandle) return;

        // loadFromCachedHandle now uses queryPermission() only — safe here.
        // If permission is "prompt" or "denied", it returns false without throwing.
        const success = await loadFromCachedHandle(cached.dirHandle);
        if (success) {
          await clearStash();
          setPermissionExpired(false);
          cachedDirHandleRef.current = null;
        } else {
          // Permission not granted — store handle for later reconnect
          cachedDirHandleRef.current = cached.dirHandle;
          setPermissionExpired(true);
          console.log(
            "[lemon-coder] Cached handle permission not granted for",
            currentProject!.name,
            "— showing reconnect prompt.",
          );
        }
      } catch (error) {
        console.error(
          "[lemon-coder] Could not restore cached handle:",
          error,
        );
      }
    }
    restoreHandle();
    return () => { cancelled = true; };
  }, [currentProject, loadDirectory, loadFromCachedHandle, clearStash]);

  const handleOpenProjectFromStudio = useCallback(() => {
    setIsLeaveStudioOpen(true);
  }, []);

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!currentProject) return;

      const sendOptions = {
        readFileContent: async (filePath: string) => {
          const item = findItemByPath(filePath);
          if (!item) throw new Error(`File not found in tree: ${filePath}`);
          return readFileContent(item);
        },
      };

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

  const handleApplyFileChanges = useCallback(
    async (fileActions: LCFileActionResult[]) => {
      for (const action of fileActions) {
        try {
          const filePath = action.FileDirectory
            ? `${action.FileDirectory}/${action.FileName}`.replace(/\/+/g, "/")
            : action.FileName;

          await writeFile(filePath, action.Content);

          console.log(
            `[lemon-coder] ${action.ExistingFile ? "Overwritten" : "Created"} file: ${filePath}`,
          );
        } catch (error) {
          console.error(
            `[lemon-coder] Failed to write ${action.FileName}, falling back to download:`,
            error,
          );

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
      clearStash();
      createChatSession(currentProject.id);
    }
  }, [currentProject, createChatSession, clearStash]);

  /**
   * Reconnect to a cached directory handle within a user gesture.
   * Called when the user clicks the "Reconnect" button after permission expired.
   * Uses requestHandlePermission() which requires user activation.
   */
  const handleReconnect = useCallback(async () => {
    const handle = cachedDirHandleRef.current;
    if (!handle) return;

    const granted = await requestHandlePermission(handle);
    if (granted) {
      setPermissionExpired(false);
      cachedDirHandleRef.current = null;
      await clearStash();
      await loadDirectory(handle);
    }
  }, [requestHandlePermission, loadDirectory, clearStash]);

  const handleSelectRecentProject = useCallback(
    async (id: string) => {
      const project = recentProjects.find((p) => p.id === id);
      if (!project) return;

      // Step 1: Set the current project immediately (sync)
      // This ensures the project ID is preserved even if permission fails later.
      await selectRecentProject(project);

      // Step 2: Try to restore the cached handle
      const cached = await lcDB.getProjectHandle(project.id);
      if (!cached?.dirHandle) {
        // No cached handle — just selected, user will need to open folder manually
        return;
      }

      // Step 3: Request permission directly (within the user gesture)
      // This runs BEFORE any other async operations that could exhaust the activation.
      const granted = await requestHandlePermission(cached.dirHandle);
      if (granted) {
        await clearStash();
        await loadDirectory(cached.dirHandle);
      } else {
        // Permission denied — store handle for later reconnect
        cachedDirHandleRef.current = cached.dirHandle;
        setPermissionExpired(true);
        console.log(
          "[lemon-coder] Cached handle permission denied for",
          project.name,
          "— showing reconnect prompt.",
        );
      }
    },
    [recentProjects, selectRecentProject, requestHandlePermission, loadDirectory, clearStash],
  );

  // Loading state
  if (isProjectLoading || !currentProject) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{ backgroundColor: LCTheme.colors.background, color: LCTheme.colors.text }}
      >
        <p className="text-sm opacity-60">Loading project…</p>
      </div>
    );
  }

  // Main workspace view
  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ backgroundColor: LCTheme.colors.background, color: LCTheme.colors.text }}
    >
      {/* Permission-expired reconnect banner */}
      {permissionExpired && cachedDirHandleRef.current && (
        <div
          className="flex items-center justify-between px-6 py-3 text-sm border-b"
          style={{
            backgroundColor: LCTheme.colors.brand + "22",
            borderColor: LCTheme.colors.border,
            color: LCTheme.colors.text,
          }}
        >
          <span>
            Project folder access has expired.
          </span>
          <button
            onClick={handleReconnect}
            className="px-4 py-1.5 rounded font-semibold text-xs transition-colors"
            style={{
              backgroundColor: LCTheme.colors.brand,
              color: LCTheme.colors.background,
            }}
          >
            Reconnect
          </button>
        </div>
      )}

      <LCMenu
        onOpenProject={handleOpenProjectFromStudio}
        onNewSession={handleCreateSession}
        onOpenHelixConfig={() => setIsHelixConfigOpen(true)}
        projectName={currentProject.name}
        recentProjects={recentProjects}
        onSelectRecentProject={handleSelectRecentProject}
      />

      <div className="flex-1 flex overflow-hidden">
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
          onRetryMessage={handleSendMessage}
        />

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

      <LCHelixConfigModal
        isOpen={isHelixConfigOpen}
        onOpenChange={setIsHelixConfigOpen}
      />

      <LCNewItemModal
        isOpen={isNewItemModalOpen}
        onOpenChange={setIsNewItemModalOpen}
        onCreate={(name, type) => {
          createItem(newFileParentPath, name, type);
        }}
        defaultPath={newFileParentPath}
        defaultType={newFileType}
      />

      {/* Leave Studio Confirmation Modal */}
      <Modal.Backdrop isOpen={isLeaveStudioOpen} onOpenChange={setIsLeaveStudioOpen}>
        <Modal.Container className="bg-[#1e1e1e] border border-[#333]">
          <Modal.Dialog className="sm:max-w-sm bg-[#1e1e1e] text-white">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading className="text-white">
                Open New Project
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm text-gray-300">
                Opening a new project will close the current project. Do you want to proceed?
              </p>
            </Modal.Body>
            <Modal.Footer>
              <Button
                slot="close"
                variant="secondary"
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                slot="close"
                onPress={() => router.push("/modules/lemon-coder")}
                className="text-xs"
              >
                Confirm
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
