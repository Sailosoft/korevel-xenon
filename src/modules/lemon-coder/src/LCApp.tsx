// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCApp Main Component
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { directoryOpen } from "browser-fs-access";
import "./LCStyle.css";
import { useLiveQuery } from "dexie-react-hooks";
import { lcDB } from "./LCDatabase";
import { useLCProject } from "./useLCProject";
import { useLCFileSystem } from "./useLCFileSystem";
import { useLCChat } from "./useLCChat";
import LCMenu from "./LCMenu";
import LCSidebar from "./LCSidebar";
import LCMainContent, { type LCMainContentHandle } from "./LCMainContent";
import LCRightSidebar from "./LCRightSidebar";
import LCHelixConfigModal from "./LCHelixConfigModal";
import LCSettingsModal from "./LCSettingsModal";
import LCLandingScreen from "./LCLandingScreen";
import LCNewItemModal from "./LCNewItemModal";
import LCDeepstashSaveModal from "./LCDeepstashSaveModal";
import type {
  LCProject,
  LCFileTreeItem,
  LCContextStashItem,
  LCDeepstash,
  LCDeepstashMergeStrategy,
  LCChatSession,
  LCFileActionResult,
  LCFileEdit,
  LCFavoriteGroup,
  LCFavoriteItem,
  LCInstructionStashItem,
} from "./LCInterface";
import { resolveFilePath, DEFAULT_FAVORITE_GROUP_NAME } from "./LCInterface";
import { LCTheme } from "./LCTheme";
import { applySearchReplace } from "./useLCChat";
import { setSendToChatHandler } from "./LCFileTree.ContextMenu";

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
  const [newFileParentPath, setNewFileParentPath] = useState("");
  const [newFileType, setNewFileType] = useState<"file" | "directory">("file");
  const [isDeepstashSaveOpen, setIsDeepstashSaveOpen] = useState(false);
  const [isDeepstashPopOpen, setIsDeepstashPopOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("lc_show_tooltip");
        return stored !== null ? stored === "true" : true;
      } catch { /* ignore */ }
    }
    return true;
  });
  const isOpeningRef = useRef(false);
  const mainContentRef = useRef<LCMainContentHandle>(null);

  // Set the module-level send-to-chat handler so the context menu can append text to chat input
  const handleSendToChat = useCallback((text: string) => {
    console.log("[LCApp] handleSendToChat called with:", text, "mainContentRef:", !!mainContentRef.current);
    if (mainContentRef.current) {
      mainContentRef.current.appendToInput(text);
    } else {
      console.warn("[LCApp] mainContentRef.current is null!");
    }
  }, []);

  // Register handler at module level so context menu can access it without prop chain
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

  // ── Favourites ────────────────────────────────────────────────────────────

  /** Live query: favourite groups for the current project */
  const favoriteGroups: LCFavoriteGroup[] =
    useLiveQuery(
      () => (currentProject ? lcDB.getFavoriteGroups(currentProject.id) : []),
      [currentProject?.id],
    ) || [];

  /** Live query: all favourite items for the current project */
  const favoriteItems: LCFavoriteItem[] =
    useLiveQuery(
      () => (currentProject ? lcDB.getAllFavoriteItems(currentProject.id) : []),
      [currentProject?.id],
    ) || [];

  // ── Instruction Stash ─────────────────────────────────────────────────────

  /** Live query: instruction stash items scoped to the current project */
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

  /** Build a map of groupId → items for easy lookup */
  const favoriteItemsByGroup = useMemo(() => {
    const map: Record<string, LCFavoriteItem[]> = {};
    for (const item of favoriteItems) {
      if (!map[item.groupId]) map[item.groupId] = [];
      map[item.groupId].push(item);
    }
    return map;
  }, [favoriteItems]);

  /**
   * Add a file tree item to favourites.
   * If groupId is provided, add to that group.
   * Otherwise, if no groups exist, creates a "Default" group first,
   * then adds to the first available group.
   */
  const handleAddToFavorites = useCallback(
    async (item: LCFileTreeItem, groupId?: string) => {
      if (!currentProject) return;

      if (groupId) {
        // Add directly to the specified group
        await lcDB.addFavoriteItem(groupId, currentProject.id, item.name, item.path);
        return;
      }

      // No group specified — use first group or create Default
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

  /** Select a file from favourites by path */
  const handleFavoriteSelectFile = useCallback(
    (path: string) => {
      const item = findItemByPath(path);
      if (item) {
        selectFile(item);
      }
    },
    [findItemByPath, selectFile],
  );

  /** Add a favourite item directly to the context stash */
  const handleFavoriteAddToStash = useCallback(
    async (path: string, name: string) => {
      // Wrap as LCFileTreeItem-like object for addToStash
      const treeItem: LCFileTreeItem = {
        id: `fav-${path}`,
        name,
        path,
        isDirectory: false,
      };
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

      // Build the send options with the file-reader for stash context
      const sendOptions = {
        readFileContent: async (filePath: string) => {
          const item = findItemByPath(filePath);
          if (!item) throw new Error(`File not found in tree: ${filePath}`);
          // readFileContent expects a tree item, but we need one by path
          // Re-use selectFile's logic — use findItemByPath to get the item
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
        // Pass instruction stash context to include in the system prompt
        instructionStashContext,
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
    [currentProject, activeSession, createChatSession, sendMessage, stashItems, findItemByPath, readFileContent, fileTree, flattenFileTree, addToStash],
  );

  /**
   * Apply file changes by writing AI-generated content directly to disk
   * using the File System Access API (via useLCFileSystem.writeFile).
   * Falls back to the download-blob approach from useLCChat.applyFileChanges
   * if writeFile is unavailable. Refreshes the file tree afterward so new
   * files appear immediately.
   */
  /**
   * Resolve and normalise a file path against the known file tree to prevent
   * path duplication bugs (e.g. writing to "src/src/..." when the directory
   * handle is already scoped to "src/").
   *
   * Strategy:
   * 1. Resolve the raw path from the AI action via resolveFilePath.
   * 2. If the resolved path matches an existing file in the tree → use it as-is.
   * 3. Otherwise, try stripping one leading directory segment at a time and
   *    check if the suffix matches a known file in the tree.
   * 4. If a match is found, use the corrected path and emit a warning.
   * 5. If no match is found, use the resolved path as-is (new file scenario).
   */
  const resolveAndNormaliseFilePath = useCallback(
    (action: LCFileActionResult): string => {
      const rawPath = resolveFilePath(action);
      const knownFilePaths = new Set(
        flattenFileTree(fileTree)
          .filter((f) => !f.isDirectory)
          .map((f) => f.path),
      );

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

          // Write directly to the filesystem via the cached directory handle
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
      // Remove all child items of this folder from the stash,
      // keeping only the folder reference itself.
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
        const sourceItem = findItemByPath(sourcePath);
        if (sourceItem && !sourceItem.isDirectory) {
          const content = await readFileContent(sourceItem);
          await createItem(destParentPath, newName, "file");
          const destPath = destParentPath ? `${destParentPath}/${newName}` : newName;
          await writeFile(destPath, content);
        } else {
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
      // Clear context stash for a fresh context
      try {
        await clearStash();
      } catch (err) {
        console.error("[lemon-coder] Failed to clear stash on new session:", err);
      }
      await createChatSession(currentProject.id);
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

  // ── Deepstash callbacks ──────────────────────────────────────────────────

  const handleSaveDeepstash = useCallback(
    async (action: { mode: "new" | "override" | "overlap"; name?: string; deepstashId?: string }) => {
      if (!currentProject) return;
      const items = stashItems;

      if (action.mode === "new" && action.name) {
        await lcDB.createDeepstash(currentProject.id, action.name, items);
      } else if (action.mode === "override" && action.deepstashId) {
        // Delete existing deepstash and its items, then re-create with same name
        const existing = await lcDB.getDeepstash(action.deepstashId);
        if (existing) {
          await lcDB.deleteDeepstash(action.deepstashId);
          await lcDB.createDeepstash(currentProject.id, existing.name, items);
        }
      } else if (action.mode === "overlap" && action.deepstashId) {
        // Load existing items, merge current stash items (keep existing paths)
        const existingItems = await lcDB.getDeepstashItems(action.deepstashId);
        const existingPaths = new Set(existingItems.map((i) => i.path));
        const newItems = items.filter((i) => !existingPaths.has(i.path));

        if (newItems.length > 0) {
          // Append only new items to the deepstash
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
          // Update timestamp
          await lcDB.deepstashes.update(action.deepstashId, { updatedAt: new Date() });
        }
      }

      setIsDeepstashSaveOpen(false);
    },
    [currentProject, stashItems],
  );

  const handleApplyDeepstash = useCallback(
    async (deepstash: LCDeepstash, strategy: LCDeepstashMergeStrategy) => {
      // Load deepstash items
      const items = await lcDB.getDeepstashItems(deepstash.id);

      if (strategy === "override") {
        // Clear current stash and add all deepstash items
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
        // Keep existing items, add only new ones (skip by path match)
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

  // Landing screen when no project is selected
  if (!currentProject) {
    return (
      <>
        <LCLandingScreen
          onOpenProject={() => handleOpenFolder()}
          recentProjects={recentProjects}
          onSelectRecentProject={handleSelectRecentProject}
          onOpenHelixConfig={() => setIsHelixConfigOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onClearRecentProjects={clearRecentProjects}
        />

        {/* Helix AI Config Modal */}
        <LCHelixConfigModal
          isOpen={isHelixConfigOpen}
          onOpenChange={setIsHelixConfigOpen}
        />
  
        {/* Settings Modal */}
        <LCSettingsModal
          isOpen={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
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
        onOpenSettings={() => setIsSettingsOpen(true)}
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
          // Instruction stash
          onAddToInstructionStash={handleAddToInstructionStash}
          // Send to Chat
          onSendToChat={handleSendToChat}
        />

        {/* Main Content */}
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
          promptMode={promptMode}
          onPromptModeChange={setPromptMode}
          sessionTitle={activeSession?.title}
          onRemoveFromStash={removeFromStash}
          onAddToStash={addToStash}
          onNewSession={handleCreateSession}
          instructionStashItems={instructionStashItems}
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
          onDeleteSession={deleteSession}
          onClearSessions={() => currentProject && clearAllSessions(currentProject.id)}
          deepstashes={deepstashes}
          onSaveDeepstash={() => setIsDeepstashSaveOpen(true)}
          onApplyDeepstash={handleApplyDeepstash}
          onDeleteDeepstash={handleDeleteDeepstash}
          onClearDeepstashes={handleClearDeepstashes}
          // Instruction stash
          instructionStashItems={instructionStashItems}
          onAddInstruction={handleAddInstruction}
          onRemoveInstruction={handleRemoveInstruction}
          onClearInstructions={handleClearInstructions}
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

      {/* Deepstash Save Modal */}
      <LCDeepstashSaveModal
        isOpen={isDeepstashSaveOpen}
        onOpenChange={setIsDeepstashSaveOpen}
        deepstashes={deepstashes}
        existingNames={deepstashes.map((d) => d.name)}
        onSave={handleSaveDeepstash}
      />
    </div>
  );
}
