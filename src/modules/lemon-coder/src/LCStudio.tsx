// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCStudio Component
// Main workspace view shown when a project is loaded (the "studio" experience)
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Modal, Button, Toast } from "@heroui/react";
import { lcDB } from "./LCDatabase";
import { getHandle, removeHandle } from "./LCHandleRegistry";
import { useLCProject } from "./useLCProject";
import { useLCFileSystem } from "./useLCFileSystem";
import { useLCChat } from "./useLCChat";
import LCMenu from "./LCMenu";
import { setSendToChatHandler } from "./LCFileTree.ContextMenu";
import LCSidebar from "./LCSidebar";
import LCMainContent, { type LCMainContentHandle } from "./LCMainContent";
import LCRightSidebar from "./LCRightSidebar";
import LCHelixConfigModal from "./LCHelixConfigModal";
import LCSettingsModal from "./LCSettingsModal";
import LCNewItemModal from "./LCNewItemModal";
import LCDeepstashSaveModal from "./LCDeepstashSaveModal";
import type {
  LCProject,
  LCFileTreeItem,
  LCContextStashItem,
  LCDeepstash,
  LCDeepstashMergeStrategy,
  LCChatSession,
  LCChatMessage,
  LCFileActionResult,
  LCFileEdit,
  LCFavoriteGroup,
  LCFavoriteItem,
  LCInstructionStashItem,
} from "./LCInterface";
import { resolveFilePath, DEFAULT_FAVORITE_GROUP_NAME } from "./LCInterface";
import { LCTheme } from "./LCTheme";
import { applySearchReplace } from "./useLCChat";

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
    dirHandle,
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
    renameItem,
    deleteItem,
  } = useLCFileSystem();

  const {
    sessions,
    activeSession,
    messages,
    isSending,
    promptMode,
    setPromptMode,
    createSession: createChatSession,
    selectSession,
    sendMessage,
    applyFileChanges,
    deleteSession,
    clearAllSessions,
  } = useLCChat();

  const [isRightSidebarExpanded, setIsRightSidebarExpanded] = useState(true);
  const [isHelixConfigOpen, setIsHelixConfigOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [isLeaveStudioOpen, setIsLeaveStudioOpen] = useState(false);
  const [isDeepstashSaveOpen, setIsDeepstashSaveOpen] = useState(false);
  const [isDeepstashPopOpen, setIsDeepstashPopOpen] = useState(false);
  const [newFileParentPath, setNewFileParentPath] = useState("");
  const [newFileType, setNewFileType] = useState<"file" | "directory">("file");
  const [permissionExpired, setPermissionExpired] = useState(false);
  const [showTooltip, setShowTooltip] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("lc_show_tooltip");
        return stored !== null ? stored === "true" : true;
      } catch { /* ignore */ }
    }
    return true;
  });
  const cachedDirHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const mainContentRef = useRef<LCMainContentHandle>(null);

  const handleSendToChat = useCallback((text: string) => {
    mainContentRef.current?.appendToInput(text);
  }, []);

  // Register the module-level handler for the context menu's "Send to Chat"
  setSendToChatHandler(handleSendToChat);

  // Live query for stash items
  const stashItems =
    useLiveQuery(() => lcDB.getStashItems()) || [];

  // Live query for chat sessions
  const chatSessions =
    useLiveQuery(
      () => (currentProject ? lcDB.getChatSessions(currentProject.id) : []),
      [currentProject?.id],
    ) || [];

  // Live query for deepstashes
  const deepstashes =
    useLiveQuery(
      () => (currentProject ? lcDB.getDeepstashes(currentProject.id) : []),
      [currentProject?.id],
    ) || [];

  // ── Instruction Stash ─────────────────────────────────────────────────────

  const instructionStashItems: LCInstructionStashItem[] =
    useLiveQuery(
      () => (currentProject ? lcDB.getInstructions(currentProject.id) : []),
      [currentProject?.id],
    ) || [];

  const handleAddInstruction = useCallback(
    async (name: string, content: string) => {
      if (!currentProject) return;
      await lcDB.addInstruction(currentProject.id, name, content);
    },
    [currentProject],
  );

  const handleRemoveInstruction = useCallback(
    async (id: string) => {
      await lcDB.removeInstruction(id);
    },
    [],
  );

  const handleClearInstructions = useCallback(async () => {
    if (!currentProject) return;
    await lcDB.clearInstructions(currentProject.id);
  }, [currentProject]);

  /** Context menu action: add file content to instruction stash */
  const handleAddToInstructionStash = useCallback(
    async (item: LCFileTreeItem) => {
      if (!currentProject) return;
      try {
        const content = await readFileContent(item);
        const name = `📄 ${item.name}`;
        await lcDB.addInstruction(currentProject.id, name, content);
      } catch (err) {
        console.error("[lemon-coder] Failed to add to instruction stash:", err);
      }
    },
    [currentProject, readFileContent],
  );

  // ── Favourites ────────────────────────────────────────────────────────────

  const favoriteGroups: LCFavoriteGroup[] =
    useLiveQuery(
      () => (currentProject ? lcDB.getFavoriteGroups(currentProject.id) : []),
      [currentProject?.id],
    ) || [];

  const favoriteItems: LCFavoriteItem[] =
    useLiveQuery(
      () => (currentProject ? lcDB.getAllFavoriteItems(currentProject.id) : []),
      [currentProject?.id],
    ) || [];

  const favoriteItemsByGroup = useMemo(() => {
    const map: Record<string, LCFavoriteItem[]> = {};
    for (const item of favoriteItems) {
      if (!map[item.groupId]) map[item.groupId] = [];
      map[item.groupId].push(item);
    }
    return map;
  }, [favoriteItems]);

  const projectDirectoryPaths = useMemo(() => {
    const dirs: string[] = [];
    const walk = (items: LCFileTreeItem[]) => {
      for (const item of items) {
        if (item.isDirectory) {
          dirs.push(item.path);
          if (item.children) walk(item.children);
        }
      }
    };
    walk(fileTree);
    return dirs;
  }, [fileTree]);

  const handleAddToFavorites = useCallback(
    async (item: LCFileTreeItem, groupId?: string) => {
      if (!currentProject) return;

      if (groupId) {
        await lcDB.addFavoriteItem(groupId, currentProject.id, item.name, item.path);
        return;
      }

      let groups = favoriteGroups;
      if (groups.length === 0) {
        const defaultGroup = await lcDB.createFavoriteGroup(
          currentProject.id,
          DEFAULT_FAVORITE_GROUP_NAME,
        );
        groups = [defaultGroup];
      }
      await lcDB.addFavoriteItem(groups[0].id, currentProject.id, item.name, item.path);
    },
    [currentProject, favoriteGroups],
  );

  const handleFavoriteSelectFile = useCallback(
    (path: string) => {
      const item = findItemByPath(path);
      if (item) selectFile(item);
    },
    [findItemByPath, selectFile],
  );

  const handleFavoriteAddToStash = useCallback(
    async (path: string, name: string) => {
      const treeItem: LCFileTreeItem = { id: `fav-${path}`, name, path, isDirectory: false };
      await addToStash(treeItem);
    },
    [addToStash],
  );

  const handleCreateFavoriteGroup = useCallback(
    async (name: string) => {
      if (!currentProject) return;
      await lcDB.createFavoriteGroup(currentProject.id, name);
    },
    [currentProject],
  );

  const handleRenameFavoriteGroup = useCallback(
    async (groupId: string, name: string) => {
      await lcDB.renameFavoriteGroup(groupId, name);
    },
    [],
  );

  const handleDeleteFavoriteGroup = useCallback(
    async (groupId: string) => {
      await lcDB.deleteFavoriteGroup(groupId);
    },
    [],
  );

  const handleRemoveFavoriteItem = useCallback(
    async (itemId: string) => {
      await lcDB.removeFavoriteItem(itemId);
    },
    [],
  );

  const handleMoveFavoriteItem = useCallback(
    async (itemId: string, newGroupId: string) => {
      await lcDB.moveFavoriteItem(itemId, newGroupId);
    },
    [],
  );

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

  /** Flatten the file tree to a list of { path, isDirectory } for plan mode cross-referencing */
  const flattenFileTree = useCallback(
    (items: LCFileTreeItem[]): Array<{ path: string; isDirectory: boolean }> => {
      const result: Array<{ path: string; isDirectory: boolean }> = [];
      const walk = (nodes: LCFileTreeItem[]) => {
        for (const node of nodes) {
          result.push({ path: node.path, isDirectory: node.isDirectory });
          if (node.children) walk(node.children);
        }
      };
      walk(items);
      return result;
    },
    [],
  );

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!currentProject) return;

      // Build instruction stash context for the system prompt
      const instructionStashContext = instructionStashItems.length > 0
        ? instructionStashItems
            .map((inst) => `--- Instruction: ${inst.name} ---\n${inst.content}`)
            .join("\n\n")
        : undefined;

      const sendOptions = {
        readFileContent: async (filePath: string) => {
          const item = findItemByPath(filePath);
          if (!item) throw new Error(`File not found in tree: ${filePath}`);
          return readFileContent(item);
        },
        // Pass file tree for plan mode cross-referencing
        fileTree: flattenFileTree(fileTree),
        // Auto-add identified files to stash in plan mode
        onFilesIdentified: (filePaths: string[]) => {
          for (const fp of filePaths) {
            const item = findItemByPath(fp);
            if (item) {
              addToStash(item);
            }
          }
        },
        // Clear stash after conversation-mode sends (Agent/Plan/Ask)
        clearStash: async () => {
          await clearStash();
        },
        // Pass instruction stash context to include in the system prompt
        instructionStashContext,
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
    [currentProject, activeSession, createChatSession, sendMessage, stashItems, findItemByPath, readFileContent, fileTree, flattenFileTree, addToStash, clearStash, instructionStashItems],
  );

  /**
   * Resolve and normalise a file path against the known file tree to prevent
   * path duplication bugs (e.g. writing to "src/src/..." when the directory
   * handle is already scoped to "src/").
   */
  const resolveAndNormaliseFilePath = useCallback(
    (action: LCFileActionResult): string => {
      const rawPath = resolveFilePath(action);
      const flatFiles = flattenFileTree(fileTree).filter((f) => !f.isDirectory);
      const knownFilePaths = new Set(flatFiles.map((f) => f.path));

      // If the resolved path already exists in the file tree, use it directly
      if (knownFilePaths.has(rawPath)) return rawPath;

      // If the file action says the file already exists, but we couldn't find it
      // at the resolved path, try stripping leading path segments to correct
      // AI over-prefixing (e.g. "src/modules/hello/world.tsx" → "modules/hello/world.tsx")
      if (action.ExistingFile) {
        const segments = rawPath.split("/");
        for (let i = 1; i < segments.length - 1; i++) {
          const candidate = segments.slice(i).join("/");
          if (knownFilePaths.has(candidate)) {
            console.warn(
              `[lemon-coder] Path corrected: "${rawPath}" → "${candidate}" (stripped leading "${segments.slice(0, i).join("/")}")`,
            );
            return candidate;
          }
        }
      }

      // For new files, also try the suffix-matching approach to prevent
      // accidentally creating nested directories when the AI over-prefixed.
      const segments = rawPath.split("/");
      for (let i = 1; i < segments.length - 1; i++) {
        const candidate = segments.slice(i).join("/");
        // Only correct if the shorter path would place the file inside a
        // directory that already exists in the tree.
        const parentDir = segments.slice(i, -1).join("/");
        const parentExists = flattenFileTree(fileTree).some(
          (f) => f.isDirectory && f.path === parentDir,
        );
        if (parentExists) {
          console.warn(
            `[lemon-coder] Path corrected (new file): "${rawPath}" → "${candidate}" (parent dir "${parentDir}" exists in tree)`,
          );
          return candidate;
        }
      }

      // Fallback: AI often returns only the filename without a directory.
      // Search existing files by filename (last path segment).
      if (action.ExistingFile) {
        const fileName = rawPath.split("/").pop();
        if (fileName) {
          const fileMatch = flatFiles.find(
            (f) => f.path.endsWith("/" + fileName) || f.path === fileName,
          );
          if (fileMatch) {
            console.warn(
              `[lemon-coder] Path corrected: "${rawPath}" → "${fileMatch.path}" (matched by filename)`,
            );
            return fileMatch.path;
          }
        }
      }

      return rawPath;
    },
    [fileTree, flattenFileTree],
  );

  const handleApplyFileChanges = useCallback(
    async (fileActions: LCFileActionResult[]) => {
      // Defensively copy each action to prevent any reference-sharing issues
      // between the original message data and the file-writing pipeline.
      for (const rawAction of fileActions) {
        // Create an isolated copy — extract primitives explicitly so that
        // the handler owns the data and cannot be affected by external mutations.
        const action: LCFileActionResult = {
          FileName: rawAction.FileName,
          ExistingFile: rawAction.ExistingFile,
          FileDirectory: rawAction.FileDirectory,
          Description: rawAction.Description,
          Content: rawAction.Content,
          Edits: rawAction.Edits,
          applyStatus: rawAction.applyStatus,
        };

        const filePath = resolveAndNormaliseFilePath(action);

        // ── Resolve output content: SEARCH/REPLACE or full Content ──────
        // Hoisted outside try/catch so download fallback can access it
        let outputContent = action.Content;

        try {
          const hasEdits =
            action.ExistingFile &&
            Array.isArray(action.Edits) &&
            action.Edits.length > 0;

          if (hasEdits) {
            try {
              const currentContent = await readFileContent(
                findItemByPath(filePath)!,
              );
              const result = applySearchReplace(currentContent, action.Edits!);
              outputContent = result.content;
              console.log(
                `[lemon-coder] Applied ${result.applied} SEARCH/REPLACE edit(s) to ${filePath}`,
              );
            } catch (err) {
              // SEARCH/REPLACE failed AND Content is empty → would clear the file
              if (!outputContent) {
                throw new Error(
                  `SEARCH/REPLACE failed for ${filePath} and Content is empty. ` +
                  `Cannot write file without content. Error: ${err instanceof Error ? err.message : err}`,
                );
              }
              console.warn(
                `[lemon-coder] SEARCH/REPLACE failed for ${filePath}, falling back to Content:`,
                err,
              );
            }
          }

          await writeFile(filePath, outputContent);

          console.log(
            `[lemon-coder] ${action.ExistingFile ? "Overwritten" : "Created"} file: ${filePath}`,
          );
        } catch (error) {
          console.error(
            `[lemon-coder] Failed to write ${action.FileName}, falling back to download:`,
            error,
          );

          // Fallback: browser download via blob URL
          // Use outputContent (which may have been patched via SEARCH/REPLACE)
          const downloadContent = outputContent || action.Content;
          if (downloadContent) {
            const blob = new Blob([downloadContent], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = action.FileName;
            a.click();
            URL.revokeObjectURL(url);
          } else {
            console.error(
              `[lemon-coder] Cannot download ${action.FileName}: Content is empty and SEARCH/REPLACE failed`,
            );
          }
        }
      }

      // Refresh the file tree so new files appear immediately
      await refreshFileTree();
    },
    [writeFile, refreshFileTree, resolveAndNormaliseFilePath, readFileContent, findItemByPath],
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

  const handleCopyItem = useCallback(
    async (sourcePath: string, destParentPath: string, newName: string) => {
      try {
        // Read source file content if it's a file (directory is just created empty)
        const sourceItem = findItemByPath(sourcePath);
        if (sourceItem && !sourceItem.isDirectory) {
          const content = await readFileContent(sourceItem);
          await createItem(destParentPath, newName, "file");
          // Write content to the new file
          const destPath = destParentPath ? `${destParentPath}/${newName}` : newName;
          await writeFile(destPath, content);
        } else {
          // For directories, just create the directory
          await createItem(destParentPath, newName, "directory");
        }
        await refreshFileTree();
      } catch (error) {
        console.error("[lemon-coder] Copy item failed:", error);
      }
    },
    [findItemByPath, readFileContent, createItem, writeFile, refreshFileTree],
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

  const handleCreateSession = useCallback(async () => {
    if (currentProject) {
      try {
        await clearStash();
      } catch (err) {
        console.error("[lemon-coder] Failed to clear stash on new session:", err);
      }
      await createChatSession(currentProject.id);
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

  // ── Deepstash callbacks ──────────────────────────────────────────────────

  const handleSaveDeepstash = useCallback(
    async (action: { mode: "new" | "override" | "overlap"; name?: string; deepstashId?: string }) => {
      if (!currentProject) return;
      const items = stashItems;

      if (action.mode === "new" && action.name) {
        await lcDB.createDeepstash(currentProject.id, action.name, items);
      } else if (action.mode === "override" && action.deepstashId) {
        const existing = await lcDB.getDeepstash(action.deepstashId);
        if (existing) {
          await lcDB.deleteDeepstash(action.deepstashId);
          await lcDB.createDeepstash(currentProject.id, existing.name, items);
        }
      } else if (action.mode === "overlap" && action.deepstashId) {
        const existingItems = await lcDB.getDeepstashItems(action.deepstashId);
        const existingPaths = new Set(existingItems.map((i) => i.path));
        const newItems = items.filter((i) => !existingPaths.has(i.path));

        if (newItems.length > 0) {
          const deepstashItemEntries = newItems.map((item) => ({
            id: crypto.randomUUID(),
            deepstashId: action.deepstashId!,
            name: item.name,
            path: item.path,
            isDirectory: item.isDirectory,
            parentId: item.parentId,
            addedAt: item.addedAt,
          }));
          await lcDB.deepstashItems.bulkAdd(deepstashItemEntries);
          await lcDB.deepstashes.update(action.deepstashId, { updatedAt: new Date() });
        }
      }

      setIsDeepstashSaveOpen(false);
    },
    [currentProject, stashItems],
  );

  const handleApplyDeepstash = useCallback(
    async (deepstash: LCDeepstash, strategy: LCDeepstashMergeStrategy) => {
      const items = await lcDB.getDeepstashItems(deepstash.id);

      if (strategy === "override") {
        await clearStash();
        for (const item of items) {
          await lcDB.addToStash({
            name: item.name,
            path: item.path,
            isDirectory: item.isDirectory,
            parentId: item.parentId,
          });
        }
      } else if (strategy === "overlap") {
        const currentPaths = new Set(stashItems.map((s) => s.path));
        for (const item of items) {
          if (!currentPaths.has(item.path)) {
            await lcDB.addToStash({
              name: item.name,
              path: item.path,
              isDirectory: item.isDirectory,
              parentId: item.parentId,
            });
          }
        }
      }

      setIsDeepstashPopOpen(false);
    },
    [clearStash, stashItems],
  );

  const handleDeleteDeepstash = useCallback(async (id: string) => {
    await lcDB.deleteDeepstash(id);
  }, []);

  const handleClearDeepstashes = useCallback(async () => {
    if (!currentProject) return;
    await lcDB.clearAllDeepstashes(currentProject.id);
  }, [currentProject]);

  // ── Export Session ──────────────────────────────────────────────────────

  const formatMessageAsMarkdown = useCallback(
    (msg: LCChatMessage, index: number): string => {
      if (msg.error) return "";
      const roleLabel = msg.role === "user" ? "User" : "AI Assistant";
      const time = new Date(msg.timestamp).toLocaleString();
      const lines: string[] = [];
      lines.push(`### ${roleLabel} — ${time}`);
      lines.push("");
      lines.push(msg.content);
      lines.push("");
      if (msg.fileContents && msg.fileContents.length > 0) {
        for (const fc of msg.fileContents) {
          const filePath = resolveFilePath(fc);
          lines.push(`> **${fc.ExistingFile ? "Edit" : "New"}:** \`${filePath}\``);
          if (fc.Description) lines.push(`> ${fc.Description}`);
        }
        lines.push("");
      }
      return lines.join("\n");
    },
    [],
  );

  const generateSessionMarkdown = useCallback(
    (session: LCChatSession, mode: "all" | "ai-only"): string => {
      const lines: string[] = [];
      lines.push(`# ${session.title}`);
      lines.push("");
      lines.push(`*Exported on ${new Date().toLocaleString()}*`);
      lines.push("");
      lines.push("---");
      lines.push("");

      const msgs = mode === "ai-only"
        ? session.messages.filter((m) => m.role === "assistant")
        : session.messages;

      if (msgs.length === 0) {
        lines.push("*No messages to export.*");
        lines.push("");
        return lines.join("\n");
      }

      let msgIndex = 0;
      for (const msg of msgs) {
        const block = formatMessageAsMarkdown(msg, msgIndex);
        if (block) {
          lines.push(block);
          msgIndex++;
        }
      }

      return lines.join("\n");
    },
    [formatMessageAsMarkdown],
  );

  const handleExportSession = useCallback(
    async (
      sessionId: string,
      mode: "all" | "ai-only",
      fileName: string,
      saveDirectory: string,
    ) => {
      const session = chatSessions.find((s) => s.id === sessionId);
      if (!session) return;

      const markdown = generateSessionMarkdown(session, mode);
      const finalName = fileName.endsWith(".md") ? fileName : `${fileName}.md`;

      if (saveDirectory) {
        const filePath = `${saveDirectory}/${finalName}`.replace(/\/+/g, "/");
        try {
          await writeFile(filePath, markdown);
          console.log(`[lemon-coder] Export written: ${filePath}`);
        } catch (err) {
          console.error("[lemon-coder] Export write failed, falling back to download:", err);
          downloadMarkdown(markdown, finalName);
        }
      } else {
        downloadMarkdown(markdown, finalName);
      }
    },
    [chatSessions, generateSessionMarkdown, writeFile, refreshFileTree],
  );

  function downloadMarkdown(content: string, fileName: string) {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

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
      <Toast.Provider />
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
        onOpenSettings={() => setIsSettingsOpen(true)}
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
          showTooltip={showTooltip}
          onToggleTooltip={() => {
            const next = !showTooltip;
            setShowTooltip(next);
            try { localStorage.setItem("lc_show_tooltip", String(next)); } catch { /* ignore */ }
          }}
          dirHandle={dirHandle}
          onRenameItem={renameItem}
          onDeleteItem={deleteItem}
          onCopyItem={handleCopyItem}
          // Favourites props
          favoriteGroups={favoriteGroups}
          favoriteItemsByGroup={favoriteItemsByGroup}
          onAddToFavorites={handleAddToFavorites}
          onFavoriteSelectFile={handleFavoriteSelectFile}
          onFavoriteAddToStash={handleFavoriteAddToStash}
          onCreateFavoriteGroup={handleCreateFavoriteGroup}
          onRenameFavoriteGroup={handleRenameFavoriteGroup}
          onDeleteFavoriteGroup={handleDeleteFavoriteGroup}
          onRemoveFavoriteItem={handleRemoveFavoriteItem}
          onMoveFavoriteItem={handleMoveFavoriteItem}
          isFavoritesLoading={false}
          onAddToInstructionStash={handleAddToInstructionStash}
          onSendToChat={handleSendToChat}
        />

        <LCMainContent
          ref={mainContentRef}
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
          promptMode={promptMode}
          onPromptModeChange={setPromptMode}
          sessionTitle={activeSession?.title}
          onRemoveFromStash={removeFromStash}
          onAddToStash={addToStash}
          onNewSession={handleCreateSession}
          onClearStash={clearStash}
          instructionStashItems={instructionStashItems}
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
          onDeleteSession={deleteSession}
          onClearSessions={() => currentProject && clearAllSessions(currentProject.id)}
          deepstashes={deepstashes}
          onSaveDeepstash={() => setIsDeepstashSaveOpen(true)}
          onApplyDeepstash={handleApplyDeepstash}
          onDeleteDeepstash={handleDeleteDeepstash}
          onClearDeepstashes={handleClearDeepstashes}
          instructionStashItems={instructionStashItems}
          onAddInstruction={handleAddInstruction}
          onRemoveInstruction={handleRemoveInstruction}
          onClearInstructions={handleClearInstructions}
          onExportSession={handleExportSession}
          projectDirectories={projectDirectoryPaths}
          currentFilePath={selectedFile?.path}
        />
      </div>

      <LCHelixConfigModal
        isOpen={isHelixConfigOpen}
        onOpenChange={setIsHelixConfigOpen}
      />

      <LCSettingsModal
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
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

      {/* Deepstash Save Modal */}
      <LCDeepstashSaveModal
        isOpen={isDeepstashSaveOpen}
        onOpenChange={setIsDeepstashSaveOpen}
        deepstashes={deepstashes}
        existingNames={deepstashes.map((d) => d.name)}
        onSave={handleSaveDeepstash}
      />

      {/* Leave Studio Confirmation Modal */}
      <Modal.Backdrop isOpen={isLeaveStudioOpen} onOpenChange={setIsLeaveStudioOpen}>
        <Modal.Container>
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
