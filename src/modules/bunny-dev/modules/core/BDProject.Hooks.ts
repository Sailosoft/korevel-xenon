"use client";

// BDProject.Hooks — Dexie live queries for the project core.

import { useLiveQuery } from "dexie-react-hooks";
import { bdDB } from "../../BDDatabase";
import type { BDProject } from "../../BDDomain.Types";

/** All projects, newest first (undefined while loading). */
export function useBDProjects(): BDProject[] | undefined {
  return useLiveQuery(
    () => bdDB.projects.orderBy("createdAt").reverse().toArray(),
    [],
  );
}

/**
 * A single project. `undefined` = still loading, `null` = not found.
 */
export function useBDProject(
  projectId: string,
): BDProject | null | undefined {
  return useLiveQuery(
    async () => (await bdDB.projects.get(projectId)) ?? null,
    [projectId],
  );
}

export interface BDProjectStats {
  members: number;
  schemaModels: number;
  apps: number;
  apiSpecs: number;
  diagrams: number;
  outlines: number;
  architectures: number;
  boardTasks: number;
  agents: number;
  files: number;
}

/** Aggregate counts used by the project overview dashboard. */
export function useBDProjectStats(
  projectId: string,
): BDProjectStats | undefined {
  return useLiveQuery(async () => {
    const tableNames = [
      "projectMembers",
      "schemaModels",
      "apps",
      "apiSpecs",
      "diagrams",
      "outlines",
      "architectures",
      "boardTasks",
      "agents",
      "projectFiles",
    ] as const;

    const counts = await Promise.all(
      tableNames.map((name) =>
        bdDB.table(name).where("projectId").equals(projectId).count(),
      ),
    );

    const [
      members,
      schemaModels,
      apps,
      apiSpecs,
      diagrams,
      outlines,
      architectures,
      boardTasks,
      agents,
      files,
    ] = counts;

    return {
      members,
      schemaModels,
      apps,
      apiSpecs,
      diagrams,
      outlines,
      architectures,
      boardTasks,
      agents,
      files,
    } satisfies BDProjectStats;
  }, [projectId]);
}
