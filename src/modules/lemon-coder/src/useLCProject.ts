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
  selectRecentProject: (project: LCProject) => Promise<void>;
  createNewSession: () => Promise<void>;
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
      // Do NOT auto-select — user must explicitly open a project via
      // the "Open Project" button or by selecting a recent project.
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

  const selectRecentProject = useCallback(
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

  return {
    currentProject,
    recentProjects,
    isLoading,
    openProject,
    selectRecentProject,
    createNewSession,
    hasRecentProjects: recentProjects.length > 0,
  };
}
