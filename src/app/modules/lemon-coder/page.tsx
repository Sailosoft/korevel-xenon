"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLCProject } from "@/src/modules/lemon-coder/src/useLCProject";
import { registerHandle } from "@/src/modules/lemon-coder/src/LCHandleRegistry";
import LCLandingScreen from "@/src/modules/lemon-coder/src/LCLandingScreen";
import LCHelixConfigModal from "@/src/modules/lemon-coder/src/LCHelixConfigModal";
import LCCreateProjectModal from "@/src/modules/lemon-coder/src/LCCreateProjectModal";

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
function extractRootHandle(result: any): FileSystemDirectoryHandle {
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
  // alternative when possible (see handleOpenProject).
  if (first?.directoryHandle) {
    return first.directoryHandle as FileSystemDirectoryHandle;
  }

  throw new Error("Could not obtain directory handle from selected folder");
}

export default function LemonCoderLandingPage() {
  const router = useRouter();
  const { recentProjects, isLoading, openProjectFromHandle, selectRecentProject, clearRecentProjects } =
    useLCProject();
  const [isHelixConfigOpen, setIsHelixConfigOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const isOpeningRef = useRef(false);

  const navigateToStudio = useCallback(
    (projectId: string) => {
      router.push(`/modules/lemon-coder/studio?projectId=${encodeURIComponent(projectId)}`);
    },
    [router],
  );

  const handleOpenProject = useCallback(async () => {
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
        const { directoryOpen } = await import("browser-fs-access");
        const result = await directoryOpen({ recursive: true, mode: "readwrite" });
        dirHandle = extractRootHandle(result);
      }

      // Create project entry
      const project = await openProjectFromHandle(dirHandle.name, dirHandle);

      // Register the handle in-memory so LCStudio can use it directly
      // instead of going through Dexie serialization (which can alter handle identity)
      registerHandle(project.id, dirHandle);

      // Navigate to studio
      navigateToStudio(project.id);
    } catch (error: any) {
      if (error.name !== "AbortError" && error.name !== "SecurityError") {
        console.error("Failed to open folder:", error);
      }
    } finally {
      isOpeningRef.current = false;
    }
  }, [openProjectFromHandle, navigateToStudio]);

  const handleSelectRecentProject = useCallback(
    async (id: string) => {
      const project = recentProjects.find((p) => p.id === id);
      if (!project) return;

      // Step 1: Get the cached handle (also sets currentProject and updates lastOpened)
      const cachedHandle = await selectRecentProject(project);

      // Step 2: If a cached handle exists, request permission within the user gesture.
      //         If granted, register it so LCStudio can load directly without reconnect prompt.
      if (cachedHandle) {
        try {
          const fsHandle = cachedHandle as unknown as import("browser-fs-access").FileSystemHandle;
          const permission = await fsHandle.queryPermission({ mode: "readwrite" });

          if (permission === "prompt") {
            // requestPermission() requires user activation — we're still within the click handler,
            // so this should succeed. If it fails, the studio's reconnect banner will handle it.
            const granted = await fsHandle.requestPermission({ mode: "readwrite" });
            if (granted === "granted") {
              registerHandle(project.id, cachedHandle);
            }
          } else if (permission === "granted") {
            registerHandle(project.id, cachedHandle);
          }
          // If "denied", fall through — studio will show reconnect banner
        } catch {
          // Permission request failed (e.g. user denied) — studio will show reconnect banner
          console.log(
            "[lemon-coder] Could not re-acquire permission for",
            project.name,
            "— studio will prompt reconnect.",
          );
        }
      }

      // Navigate to studio — if permission was re-acquired above, the handle
      // is in the in-memory registry and studio loads directly.
      // Otherwise, studio will query permission (no gesture needed) and show
      // the reconnect banner if not granted.
      navigateToStudio(project.id);
    },
    [recentProjects, selectRecentProject, navigateToStudio],
  );

  const handleCreateProject = useCallback(
    async (name: string, _folderPath: string) => {
      try {
        let dirHandle: FileSystemDirectoryHandle;

        if (typeof (window as any).showDirectoryPicker === "function") {
          dirHandle = await (window as any).showDirectoryPicker({
            mode: "readwrite",
          });
        } else {
          const { directoryOpen } = await import("browser-fs-access");
          const result = await directoryOpen({ recursive: true, mode: "readwrite" });
          dirHandle = extractRootHandle(result);
        }

        // Use the custom name instead of the directory name
        const project = await openProjectFromHandle(name, dirHandle);

        registerHandle(project.id, dirHandle);

        navigateToStudio(project.id);
      } catch (error: any) {
        if (error.name !== "AbortError" && error.name !== "SecurityError") {
          console.error("Failed to create project:", error);
        }
      }
    },
    [openProjectFromHandle, navigateToStudio],
  );

  return (
    <>
      <LCLandingScreen
        onOpenProject={handleOpenProject}
        onOpenCreateProject={() => setIsCreateProjectOpen(true)}
        recentProjects={recentProjects}
        onSelectRecentProject={handleSelectRecentProject}
        onOpenHelixConfig={() => setIsHelixConfigOpen(true)}
        onClearRecentProjects={clearRecentProjects}
      />

      <LCHelixConfigModal
        isOpen={isHelixConfigOpen}
        onOpenChange={setIsHelixConfigOpen}
      />

      <LCCreateProjectModal
        isOpen={isCreateProjectOpen}
        onOpenChange={setIsCreateProjectOpen}
        onCreateProject={handleCreateProject}
      />
    </>
  );
}
