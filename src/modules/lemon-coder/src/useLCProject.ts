// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — useLCProject Hook
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useCallback, useEffect } from "react";
import { lcDB } from "./LCDatabase";
import type { LCProject } from "./LCInterface";

export interface UseLCProjectReturn {
  currentProject: LCProject | null;
  recentProjects: LCProject[];
  isLoading: boolean;
  openProject: (name: string) => Promise<void>;
  /**
   * Open a folder that was just picked via the directory picker.
   * Creates a project entry AND caches the FileSystemDirectoryHandle in Dexie.
   * Returns the created project.
   */
  openProjectFromHandle: (
    name: string,
    dirHandle: FileSystemDirectoryHandle,
  ) => Promise<LCProject>;
  /**
   * Select a recent project and attempt to restore its cached directory handle.
   * Returns the cached handle if available, or undefined if not cached.
   * The caller should check if permission is still valid and load the directory.
   */
  selectRecentProject: (
    project: LCProject,
  ) => Promise<FileSystemDirectoryHandle | undefined>;
  selectRecentProjectNoHandle: (project: LCProject) => Promise<void>;
  createNewSession: () => Promise<void>;
  clearRecentProjects: () => Promise<void>;
  hasRecentProjects: boolean;
}

export function useLCProject(): UseLCProjectReturn {
  const [currentProject, setCurrentProject] = useState<LCProject | null>(null);
  const [recentProjects, setRecentProjects] = useState<LCProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load recent projects on mount
  useEffect(() => {
    loadRecentProjects();
  }, []);

  const loadRecentProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const projects = await lcDB.getRecentProjects();
      setRecentProjects(projects);
    } catch (error) {
      console.error("Failed to load recent projects:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openProject = useCallback(async (name: string) => {
    try {
      const project = await lcDB.createProject(name, name);
      setCurrentProject(project);
      await loadRecentProjects();
    } catch (error: any) {
      console.error("Failed to create project:", error);
    }
  }, [loadRecentProjects]);

  const openProjectFromHandle = useCallback(
    async (
      name: string,
      dirHandle: FileSystemDirectoryHandle,
    ): Promise<LCProject> => {
      // Create the project entry
      const project = await lcDB.createProject(name, name);
      // Cache the directory handle in Dexie (structured-clonable)
      await lcDB.saveProjectHandle(project.id, dirHandle);
      // Set as current project
      setCurrentProject(project);
      await loadRecentProjects();
      return project;
    },
    [loadRecentProjects],
  );

  const selectRecentProject = useCallback(
    async (project: LCProject): Promise<FileSystemDirectoryHandle | undefined> => {
      setCurrentProject(project);
      await lcDB.updateLastOpened(project.id);

      // Try to restore the cached directory handle
      try {
        const cached = await lcDB.getProjectHandle(project.id);
        if (cached?.dirHandle) {
          return cached.dirHandle;
        }
      } catch (error) {
        console.warn(
          "[lemon-coder] Could not restore cached handle for project:",
          project.name,
          error,
        );
      }
      return undefined;
    },
    [],
  );

  const selectRecentProjectNoHandle = useCallback(
    async (project: LCProject) => {
      setCurrentProject(project);
      await lcDB.updateLastOpened(project.id);
    },
    [],
  );

  const createNewSession = useCallback(async () => {
    // This will reset to project selection view
    setCurrentProject(null);
  }, []);

  const clearRecentProjects = useCallback(async () => {
    try {
      await lcDB.clearRecentProjects();
      setRecentProjects([]);
    } catch (error) {
      console.error("Failed to clear recent projects:", error);
    }
  }, []);

  return {
    currentProject,
    recentProjects,
    isLoading,
    openProject,
    openProjectFromHandle,
    selectRecentProject,
    selectRecentProjectNoHandle,
    createNewSession,
    clearRecentProjects,
    hasRecentProjects: recentProjects.length > 0,
  };
}
