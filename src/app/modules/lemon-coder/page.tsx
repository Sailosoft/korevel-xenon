"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLCProject } from "@/src/modules/lemon-coder/src/useLCProject";
import { registerHandle } from "@/src/modules/lemon-coder/src/LCHandleRegistry";
import LCLandingScreen from "@/src/modules/lemon-coder/src/LCLandingScreen";
import LCHelixConfigModal from "@/src/modules/lemon-coder/src/LCHelixConfigModal";

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

      // Select the project (updates lastOpened, tries to restore handle)
      await selectRecentProject(project);

      // Navigate to studio — LCStudio will attempt to restore the cached handle
      navigateToStudio(project.id);
    },
    [recentProjects, selectRecentProject, navigateToStudio],
  );

  return (
    <>
      <LCLandingScreen
        onOpenProject={handleOpenProject}
        recentProjects={recentProjects}
        onSelectRecentProject={handleSelectRecentProject}
        onOpenHelixConfig={() => setIsHelixConfigOpen(true)}
        onClearRecentProjects={clearRecentProjects}
      />

      <LCHelixConfigModal
        isOpen={isHelixConfigOpen}
        onOpenChange={setIsHelixConfigOpen}
      />
    </>
  );
}
