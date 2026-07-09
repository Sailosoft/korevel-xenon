// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — useLCFileSystem Hook
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "@heroui/react";
import type {
  LCFileTreeItem,
  LCContextStashItem,
  LCExternalChangeStatus,
} from "./LCInterface";
import { lcDB } from "./LCDatabase";

// FileSystemObserver is a newer browser API not yet in TS DOM types
declare var FileSystemObserver: {
  new (
    callback: (
      records: Array<{ changedHandle: FileSystemFileHandle }>,
    ) => void,
  ): {
    observe: (handle: FileSystemDirectoryHandle) => void;
    disconnect: () => void;
  };
};

export interface UseLCFileSystemReturn {
  /** The root directory handle for the currently open project (null when no project is open) */
  dirHandle: FileSystemDirectoryHandle | null;
  fileTree: LCFileTreeItem[];
  selectedFile: LCFileTreeItem | null;
  selectedFileContent: string;
  isDirty: boolean;
  isLoading: boolean;
  /** Current external-change status for the active file */
  externalChangeStatus: LCExternalChangeStatus;
  loadDirectory: (dirHandle: FileSystemDirectoryHandle) => Promise<void>;
  /**
   * Load a directory from a cached handle when permission is already granted.
   * Uses only queryPermission() — safe to call outside user gesture (e.g. useEffect).
   * Returns true if the handle was usable, false if permission was denied/prompt.
   * Callers needing to re-request permission should use requestHandlePermission()
   * from within a user gesture first, then call this.
   */
  loadFromCachedHandle: (dirHandle: FileSystemDirectoryHandle) => Promise<boolean>;
  /**
   * Request readwrite permission on a cached directory handle.
   * MUST be called within a user gesture (click handler).
   * Returns true if permission was granted.
   */
  requestHandlePermission: (dirHandle: FileSystemDirectoryHandle) => Promise<boolean>;
  selectFile: (item: LCFileTreeItem) => void;
  toggleExpand: (item: LCFileTreeItem) => void;
  addToStash: (item: LCFileTreeItem) => Promise<void>;
  removeFromStash: (id: string) => Promise<void>;
  clearStash: () => Promise<void>;
  readFileContent: (item: LCFileTreeItem) => Promise<string>;
  setSelectedFileContent: (content: string) => void;
  findItemByPath: (path: string) => LCFileTreeItem | undefined;
  /** Manually refresh the file tree from the cached directory handle */
  refreshFileTree: () => Promise<void>;
  /** Reload the currently selected file content from disk */
  reloadActiveFile: () => Promise<void>;
  /** Dismiss the external-change warning for the current file */
  acknowledgeExternalChange: () => void;
  /** Save the currently selected file content back to disk using the File System Access API */
  saveFile: () => Promise<void>;
  /**
   * Write content to any filepath relative to the project root,
   * creating or overwriting the file at that path.
   */
  writeFile: (filePath: string, content: string) => Promise<void>;
  /**
   * Create a new file or folder at the specified path.
   */
  createItem: (path: string, name: string, type: "file" | "directory") => Promise<void>;
  /**
   * Rename a file or folder in the filesystem.
   */
  renameItem: (itemPath: string, newName: string) => Promise<void>;
  /**
   * Delete a file or folder from the filesystem.
   */
  deleteItem: (itemPath: string, isDirectory: boolean) => Promise<void>;
}

/**
 * Read the last-modified timestamp of a file via the File System Access API.
 * Returns 0 if the file cannot be accessed (e.g. directory).
 */
async function getFileLastModified(
  rootHandle: FileSystemDirectoryHandle,
  filePath: string,
): Promise<number> {
  try {
    const parts = filePath.split("/");
    let currentDir = rootHandle;
    for (let i = 0; i < parts.length - 1; i++) {
      currentDir = await currentDir.getDirectoryHandle(parts[i]);
    }
    const fileHandle = await currentDir.getFileHandle(parts[parts.length - 1]);
    const file = await fileHandle.getFile();
    return file.lastModified;
  } catch {
    return 0;
  }
}

async function readDirectoryRecursive(
  dirHandle: FileSystemDirectoryHandle,
  path: string = "",
): Promise<LCFileTreeItem[]> {
  const items: LCFileTreeItem[] = [];

  for await (const [name, handle] of (dirHandle as any).entries()) {
    const itemPath = path ? `${path}/${name}` : name;
    const isDirectory = handle.kind === "directory";

    const treeItem: LCFileTreeItem = {
      id: itemPath,
      name,
      path: itemPath,
      isDirectory,
      expanded: false,
    };

    if (isDirectory) {
      treeItem.children = await readDirectoryRecursive(handle, itemPath);
    }

    items.push(treeItem);
  }

  // Sort: directories first, then files, alphabetically
  items.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return items;
}

/**
 * Traverse the directory handle tree to find a file by its relative path
 * and read its text content using the File System API.
 * Also returns the file's lastModified timestamp.
 */
async function readFileContentFromHandle(
  rootHandle: FileSystemDirectoryHandle,
  filePath: string,
): Promise<{ content: string; lastModified: number }> {
  const parts = filePath.split("/");
  let currentHandle: FileSystemDirectoryHandle | FileSystemFileHandle = rootHandle;

  // Navigate through directory parts (all except the last which is the filename)
  for (let i = 0; i < parts.length - 1; i++) {
    currentHandle = await (currentHandle as FileSystemDirectoryHandle).getDirectoryHandle(
      parts[i],
    );
  }

  // Get the file handle for the last part (the filename)
  const fileName = parts[parts.length - 1];
  const fileHandle = await (currentHandle as FileSystemDirectoryHandle).getFileHandle(
    fileName,
  );

  // Read the file content
  const file = await fileHandle.getFile();
  const text = await file.text();
  return { content: text, lastModified: file.lastModified };
}

/**
 * Traverse the directory handle tree to find a file by its relative path
 * and write text content to it using the File System Access API.
 */
async function writeFileContentToHandle(
  rootHandle: FileSystemDirectoryHandle,
  filePath: string,
  content: string,
): Promise<void> {
  const parts = filePath.split("/");
  let currentHandle: FileSystemDirectoryHandle = rootHandle;

  // Navigate through directory parts (all except the last which is the filename)
  // Create intermediate directories if they don't exist (important for new files
  // in subdirectories that haven't been created yet).
  for (let i = 0; i < parts.length - 1; i++) {
    currentHandle = await currentHandle.getDirectoryHandle(parts[i], { create: true });
  }

  // Get or create the file handle for the last part (the filename)
  const fileName = parts[parts.length - 1];
  const fileHandle = await currentHandle.getFileHandle(fileName, { create: true });

  // Create a writable stream and write the content
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

async function createItemInHandle(
  rootHandle: FileSystemDirectoryHandle,
  parentPath: string,
  name: string,
  type: "file" | "directory",
): Promise<void> {
  let currentHandle: FileSystemDirectoryHandle = rootHandle;

  if (parentPath) {
    const parts = parentPath.split("/");
    for (const part of parts) {
      currentHandle = await currentHandle.getDirectoryHandle(part);
    }
  }

  if (type === "directory") {
    await currentHandle.getDirectoryHandle(name, { create: true });
  } else {
    await currentHandle.getFileHandle(name, { create: true });
  }
}

/**
 * Delete a file or directory entry from the filesystem.
 */
async function deleteItemInHandle(
  rootHandle: FileSystemDirectoryHandle,
  itemPath: string,
  isDirectory: boolean,
): Promise<void> {
  const parts = itemPath.split("/");
  const name = parts.pop()!;
  let currentHandle: FileSystemDirectoryHandle = rootHandle;

  for (const part of parts) {
    currentHandle = await currentHandle.getDirectoryHandle(part);
  }

  await currentHandle.removeEntry(name, { recursive: isDirectory });
}

/**
 * Rename a file by reading its content, creating a new file, and deleting the old one.
 * For directories, creates a new empty directory and deletes the old one.
 * Note: Directory rename does NOT transfer children — the user should refresh.
 */
async function renameItemInHandle(
  rootHandle: FileSystemDirectoryHandle,
  itemPath: string,
  newName: string,
): Promise<void> {
  const parts = itemPath.split("/");
  const oldName = parts.pop()!;
  const parentPath = parts.join("/");

  let currentHandle: FileSystemDirectoryHandle = rootHandle;
  if (parentPath) {
    const parentParts = parentPath.split("/");
    for (const part of parentParts) {
      currentHandle = await currentHandle.getDirectoryHandle(part);
    }
  }

  // Check if it's a directory by trying to get a directory handle
  let isDirectory = false;
  try {
    await currentHandle.getDirectoryHandle(oldName);
    isDirectory = true;
  } catch {
    isDirectory = false;
  }

  if (isDirectory) {
    // Create a new empty directory
    await currentHandle.getDirectoryHandle(newName, { create: true });
    // Remove the old directory
    await currentHandle.removeEntry(oldName, { recursive: true });
  } else {
    // For files: read content, create new file, write content, delete old file
    const { content } = await readFileContentFromHandle(rootHandle, itemPath);
    const newFileHandle = await currentHandle.getFileHandle(newName, { create: true });
    const writable = await newFileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    await currentHandle.removeEntry(oldName);
  }
}

function findItemByPathRecursive(
  items: LCFileTreeItem[],
  path: string,
): LCFileTreeItem | undefined {
  for (const item of items) {
    if (item.path === path) return item;
    if (item.children) {
      const found = findItemByPathRecursive(item.children, path);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Deep-clone the file tree (used when refreshing so React sees a new reference).
 */
function cloneTree(items: LCFileTreeItem[]): LCFileTreeItem[] {
  return items.map((item) => ({
    ...item,
    children: item.children ? cloneTree(item.children) : undefined,
  }));
}

export function useLCFileSystem(): UseLCFileSystemReturn {
  const [fileTree, setFileTree] = useState<LCFileTreeItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<LCFileTreeItem | null>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<string>("");
  const [originalFileContent, setOriginalFileContent] = useState<string>("");
  const isDirty = selectedFileContent !== originalFileContent;
  const [isLoading, setIsLoading] = useState(false);
  const [externalChangeStatus, setExternalChangeStatus] = useState<LCExternalChangeStatus>({
    hasExternalChange: false,
    diskLastModified: null,
  });

  // Keep a ref to the root directory handle so we can read file contents later
  const dirHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  // Map: filePath → lastKnownModified timestamp
  const lastModifiedMapRef = useRef<Map<string, number>>(new Map());
  // Ref to the FileSystemObserver instance (if available)
  const observerRef = useRef<any>(null);
  // Preserve the expanded-state tree so we can restore it after a full re-read
  const expandedPathsRef = useRef<Set<string>>(new Set());
  // Sync ref with state so async callbacks always see the latest selectedFile
  // without causing dependency changes on setupFileObserver / loadDirectory.
  const selectedFileRef = useRef(selectedFile);
  selectedFileRef.current = selectedFile;

  // ────────────────────────────────────────────────────────────────────────────
  // File watching setup / teardown
  // ────────────────────────────────────────────────────────────────────────────

  /** Check if the currently open file was modified externally and update status. */
  const checkActiveFileForExternalChange = useCallback(async () => {
    if (!dirHandleRef.current || !selectedFile || selectedFile.isDirectory) return;

    const filePath = selectedFile.path;
    const knownTs = lastModifiedMapRef.current.get(filePath) ?? 0;
    const diskTs = await getFileLastModified(dirHandleRef.current, filePath);

    if (diskTs > knownTs) {
      setExternalChangeStatus({ hasExternalChange: true, diskLastModified: diskTs });
    }
  }, [selectedFile]);

  /** Window focus listener — poll for external changes when user returns to the tab. */
  useEffect(() => {
    const handleFocus = () => {
      checkActiveFileForExternalChange();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [checkActiveFileForExternalChange]);

  /**
   * Set up FileSystemObserver (Strategy 1) if the browser supports it.
   * This fires callbacks when files/directories change on disk.
   */
  const setupFileObserver = useCallback(
    async (rootHandle: FileSystemDirectoryHandle) => {
      // Feature detection
      if (typeof FileSystemObserver === "undefined") {
        console.log(
          "[lemon-coder] FileSystemObserver not available — falling back to focus polling.",
        );
        return;
      }

      try {
        const observer = new (FileSystemObserver as any)(
          async (records: any[]) => {
            for (const record of records) {
              const handle = record.changedHandle;
              // `changedHandle` can be null (e.g. when a directory is created,
              // or when the observer fires a generic change notification).
              if (!handle) continue;

              // Build the relative path from the handle name chain
              let relativePath = handle.name;
              let parent = await record.root.getFileHandle?.(handle.name).catch(() => null);

              // Try to determine the relative path by looking at the record metadata
              if (record.type === "modified") {
                // Find the file in our tree by name match (simplified)
                const affectedPath = handle.name;

                // Update the lastModified map for this file
                if (dirHandleRef.current) {
                  const diskTs = await getFileLastModified(
                    dirHandleRef.current,
                    affectedPath,
                  );
                  lastModifiedMapRef.current.set(affectedPath, diskTs);
                }

                // If this is the currently open file, signal external change
                // Use the ref to avoid capturing selectedFile in the closure,
                // which would make setupFileObserver depend on selectedFile
                // and cascade into loadDirectory → restoreHandle effect re-runs.
                const currentFile = selectedFileRef.current;
                if (currentFile && currentFile.path === affectedPath) {
                  const diskTs =
                    lastModifiedMapRef.current.get(affectedPath) ?? 0;
                  setExternalChangeStatus({
                    hasExternalChange: true,
                    diskLastModified: diskTs,
                  });
                }
              }
            }
          },
        );

        await observer.observe(rootHandle, { recursive: true });
        observerRef.current = observer;
        console.log("[lemon-coder] FileSystemObserver active.");
      } catch (err) {
        console.warn("[lemon-coder] FileSystemObserver setup failed:", err);
      }
    },
    [],
  );

  // ────────────────────────────────────────────────────────────────────────────
  // Public API
  // ────────────────────────────────────────────────────────────────────────────

  const loadDirectory = useCallback(
    async (dirHandle: FileSystemDirectoryHandle) => {
      setIsLoading(true);
      try {
        dirHandleRef.current = dirHandle;
        const items = await readDirectoryRecursive(dirHandle);
        setFileTree(items);
        // Reset selection when loading a new directory
        setSelectedFile(null);
        setSelectedFileContent("");
        setExternalChangeStatus({ hasExternalChange: false, diskLastModified: null });
        lastModifiedMapRef.current.clear();
        expandedPathsRef.current.clear();

        // Set up watcher (Strategy 1: FileSystemObserver)
        await setupFileObserver(dirHandle);
      } catch (error) {
        console.error("Failed to load directory:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [setupFileObserver],
  );

  /**
   * Load a directory from a cached FileSystemDirectoryHandle.
   * Uses ONLY queryPermission() — safe to call outside user gesture (e.g. useEffect).
   * Does NOT call requestPermission(), which requires a user gesture.
   * Returns true if the handle was usable, false if permission was "prompt" or "denied".
   * Callers that need to request permission should call requestHandlePermission()
   * from within a user gesture first, then call this.
   */
  const loadFromCachedHandle = useCallback(
    async (dirHandle: FileSystemDirectoryHandle): Promise<boolean> => {
      try {
        // queryPermission / requestPermission exist at runtime on FileSystemHandle
        // but aren't in TS 5.5 DOM types yet — cast via browser-fs-access types
        const handle = dirHandle as unknown as import("browser-fs-access").FileSystemHandle;

        // Step 1: Check current permission state (safe outside user gesture)
        const permission = await handle.queryPermission({ mode: "readwrite" });

        // Step 2: Only load if already granted — do NOT call requestPermission here
        // because this may be called from a useEffect (outside user gesture).
        if (permission !== "granted") {
          console.warn(
            "[lemon-coder] Cached handle permission is '" + permission +
            "' — caller must use requestHandlePermission() within a user gesture first.",
          );
          return false;
        }

        // Step 3: Permission is granted — load the directory
        await loadDirectory(dirHandle);
        return true;
      } catch (error) {
        console.error("[lemon-coder] Failed to use cached directory handle:", error);
        return false;
      }
    },
    [loadDirectory],
  );

  /**
   * Request readwrite permission on a cached directory handle.
   * MUST be called within a user gesture (click handler).
   * Returns true if permission was granted.
   */
  const requestHandlePermission = useCallback(
    async (dirHandle: FileSystemDirectoryHandle): Promise<boolean> => {
      try {
        const handle = dirHandle as unknown as import("browser-fs-access").FileSystemHandle;
        const permission = await handle.requestPermission({ mode: "readwrite" });
        if (permission !== "granted") {
          console.warn(
            "[lemon-coder] requestHandlePermission: user denied permission.",
          );
          return false;
        }
        return true;
      } catch (error) {
        console.error("[lemon-coder] Failed to request handle permission:", error);
        return false;
      }
    },
    [],
  );

  const selectFile = useCallback(
    async (item: LCFileTreeItem) => {
      if (!item.isDirectory) {
        // Spread into a new object so React detects change even when re-selecting
        // the same file (same id, same reference would be skipped by Object.is).
        setSelectedFile({ ...item });
        setExternalChangeStatus({ hasExternalChange: false, diskLastModified: null });

        try {
          if (!dirHandleRef.current) {
            throw new Error("No directory handle available");
          }
          const { content, lastModified } = await readFileContentFromHandle(
            dirHandleRef.current,
            item.path,
          );
          // Store the known last-modified timestamp for external-change detection
          lastModifiedMapRef.current.set(item.path, lastModified);
          setSelectedFileContent(content);
          setOriginalFileContent(content);
        } catch (error) {
          console.error("Failed to read file content:", error);
          setSelectedFileContent(
            `// Error reading file: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }
    },
    [],
  );

  const toggleExpand = useCallback((item: LCFileTreeItem) => {
    setFileTree((prev) => {
      const updateItem = (items: LCFileTreeItem[]): LCFileTreeItem[] => {
        return items.map((i) => {
          if (i.id === item.id) {
            const newExpanded = !i.expanded;
            // Track expanded paths for tree refresh preservation
            if (newExpanded) {
              expandedPathsRef.current.add(i.path);
            } else {
              expandedPathsRef.current.delete(i.path);
            }
            return { ...i, expanded: newExpanded };
          }
          if (i.children) {
            return { ...i, children: updateItem(i.children) };
          }
          return i;
        });
      };
      return updateItem(prev);
    });
  }, []);

  const addToStash = useCallback(async (item: LCFileTreeItem) => {
    if (item.isDirectory && item.children) {
      // Create a folder group in stash
      const parentStash = await lcDB.addToStash({
        name: item.name,
        path: item.path,
        isDirectory: true,
      });
      // Add first-level files as children of the folder group
      const files = item.children.filter((c) => !c.isDirectory);
      for (const child of files) {
        await lcDB.addToStash({
          name: child.name,
          path: child.path,
          isDirectory: false,
          parentId: parentStash.id,
        });
      }
    } else if (!item.isDirectory) {
      await lcDB.addToStash({
        name: item.name,
        path: item.path,
        isDirectory: false,
      });
    }
  }, []);

  const removeFromStash = useCallback(async (id: string) => {
    // Query Dexie directly to find the target and its children
    const allItems = await lcDB.contextStash.toArray();
    const target = allItems.find((s) => s.id === id);
    if (target?.isDirectory) {
      const childIds = allItems
        .filter((s) => s.parentId === id)
        .map((s) => s.id);
      for (const childId of childIds) {
        await lcDB.removeFromStash(childId);
      }
    }
    await lcDB.removeFromStash(id);
  }, []);

  const clearStash = useCallback(async () => {
    await lcDB.clearStash();
  }, []);

  const readFileContent = useCallback(
    async (item: LCFileTreeItem): Promise<string> => {
      if (!dirHandleRef.current) {
        throw new Error("No directory handle available");
      }
      const { content } = await readFileContentFromHandle(
        dirHandleRef.current,
        item.path,
      );
      return content;
    },
    [],
  );

  const findItemByPath = useCallback(
    (path: string): LCFileTreeItem | undefined => {
      return findItemByPathRecursive(fileTree, path);
    },
    [fileTree],
  );

  /**
   * Setter wrapper that marks the external-change status as resolved
   * whenever the user types in the editor (they've acknowledged the change).
   */
  const setSelectedFileContentWithAck = useCallback(
    (content: string) => {
      setSelectedFileContent(content);
      // User is editing — dismiss the external-change warning
      setExternalChangeStatus({ hasExternalChange: false, diskLastModified: null });
    },
    [],
  );

  /**
   * Strategy 2 (fallback): Refresh the file tree from the cached directory handle.
   * Preserves expanded state so the user doesn't lose their tree context.
   */
  const refreshFileTree = useCallback(async () => {
    if (!dirHandleRef.current) return;

    setIsLoading(true);
    try {
      const items = await readDirectoryRecursive(dirHandleRef.current);
      // Restore expanded states from the ref
      const restoreExpanded = (nodes: LCFileTreeItem[]): LCFileTreeItem[] =>
        nodes.map((node) => ({
          ...node,
          expanded: expandedPathsRef.current.has(node.path),
          children: node.children ? restoreExpanded(node.children) : undefined,
        }));
      setFileTree(restoreExpanded(items));
      console.log("[lemon-coder] File tree refreshed manually.");
    } catch (error) {
      console.error("Failed to refresh file tree:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Strategy 3: Reload the active file from disk, overwriting any editor changes.
   */
  const reloadActiveFile = useCallback(async () => {
    if (!dirHandleRef.current || !selectedFile || selectedFile.isDirectory) return;

    try {
      const { content, lastModified } = await readFileContentFromHandle(
        dirHandleRef.current,
        selectedFile.path,
      );
      lastModifiedMapRef.current.set(selectedFile.path, lastModified);
      setSelectedFileContent(content);
      setOriginalFileContent(content);
      setExternalChangeStatus({ hasExternalChange: false, diskLastModified: null });
      console.log("[lemon-coder] Active file reloaded from disk.");
    } catch (error) {
      console.error("Failed to reload file:", error);
    }
  }, [selectedFile]);

  /** Dismiss the external-change warning without reloading. */
  const acknowledgeExternalChange = useCallback(() => {
    // Update the known timestamp to match disk so future focus events don't re-trigger
    if (selectedFile && externalChangeStatus.diskLastModified !== null) {
      lastModifiedMapRef.current.set(
        selectedFile.path,
        externalChangeStatus.diskLastModified,
      );
    }
    setExternalChangeStatus({ hasExternalChange: false, diskLastModified: null });
  }, [selectedFile, externalChangeStatus]);

  /**
   * Save the currently selected file content back to disk
   * using the File System Access API writable stream.
   */
  const saveFile = useCallback(async () => {
    if (!dirHandleRef.current || !selectedFile || selectedFile.isDirectory) return;

    try {
      await writeFileContentToHandle(
        dirHandleRef.current,
        selectedFile.path,
        selectedFileContent,
      );
      // Update the last-modified timestamp so external-change detection resets
      const diskTs = await getFileLastModified(dirHandleRef.current, selectedFile.path);
      lastModifiedMapRef.current.set(selectedFile.path, diskTs);
      setOriginalFileContent(selectedFileContent);
      setExternalChangeStatus({ hasExternalChange: false, diskLastModified: null });
      console.log(`[lemon-coder] Saved: ${selectedFile.path}`);
    } catch (error) {
      console.error("Failed to save file:", error);
    }
  }, [selectedFile, selectedFileContent]);

  /**
   * Write content to any filepath relative to the project root,
   * creating or overwriting the file at that path.
   * Uses the cached directory handle from the loaded project.
   */
  const writeFile = useCallback(async (filePath: string, content: string) => {
    if (!dirHandleRef.current) {
      throw new Error("No project directory handle available. Open a project first.");
    }
    await writeFileContentToHandle(dirHandleRef.current, filePath, content);
    // Also update the lastModified map if this happens to be the active file
    if (selectedFile && selectedFile.path === filePath) {
      const diskTs = await getFileLastModified(dirHandleRef.current, filePath);
      lastModifiedMapRef.current.set(filePath, diskTs);
      setExternalChangeStatus({ hasExternalChange: false, diskLastModified: null });
    }
    console.log(`[lemon-coder] Written: ${filePath}`);
  }, [selectedFile]);

  const createItem = useCallback(
    async (parentPath: string, name: string, type: "file" | "directory") => {
      if (!dirHandleRef.current) {
        throw new Error("No project directory handle available. Open a project first.");
      }
      try {
        await createItemInHandle(dirHandleRef.current, parentPath, name, type);
        await refreshFileTree();
        console.log(`[lemon-coder] Created ${type}: ${parentPath}/${name}`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        toast.danger(`Failed to create ${type}: ${msg}`);
        throw error;
      }
    },
    [refreshFileTree],
  );

  const deleteItem = useCallback(
    async (itemPath: string, isDirectory: boolean) => {
      if (!dirHandleRef.current) {
        throw new Error("No project directory handle available. Open a project first.");
      }
      try {
        await deleteItemInHandle(dirHandleRef.current, itemPath, isDirectory);
        // If the deleted item was the selected file, clear selection
        if (selectedFile?.path === itemPath) {
          setSelectedFile(null);
          setSelectedFileContent("");
        }
        await refreshFileTree();
        console.log(`[lemon-coder] Deleted: ${itemPath}`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        toast.danger(`Failed to delete: ${msg}`);
        throw error;
      }
    },
    [refreshFileTree, selectedFile],
  );

  const renameItem = useCallback(
    async (itemPath: string, newName: string) => {
      if (!dirHandleRef.current) {
        throw new Error("No project directory handle available. Open a project first.");
      }
      try {
        await renameItemInHandle(dirHandleRef.current, itemPath, newName);
        // If the renamed item was the selected file, clear selection (path changed)
        // The user can re-select the renamed file from the refreshed tree
        if (selectedFile?.path === itemPath) {
          setSelectedFile(null);
          setSelectedFileContent("");
        }
        await refreshFileTree();
        console.log(`[lemon-coder] Renamed: ${itemPath} → ${newName}`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        toast.danger(`Failed to rename: ${msg}`);
        throw error;
      }
    },
    [refreshFileTree, selectedFile],
  );

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        try {
          observerRef.current.disconnect?.();
        } catch {
          // ignore
        }
        observerRef.current = null;
      }
    };
  }, []);

  return {
    dirHandle: dirHandleRef.current,
    fileTree,
    selectedFile,
    selectedFileContent,
    isDirty,
    isLoading,
    externalChangeStatus,
    loadDirectory,
    loadFromCachedHandle,
    requestHandlePermission,
    selectFile,
    toggleExpand,
    addToStash,
    removeFromStash,
    clearStash,
    readFileContent,
    setSelectedFileContent: setSelectedFileContentWithAck,
    findItemByPath,
    refreshFileTree,
    reloadActiveFile,
    acknowledgeExternalChange,
    saveFile,
    writeFile,
    createItem,
    renameItem,
    deleteItem,
  };
}
