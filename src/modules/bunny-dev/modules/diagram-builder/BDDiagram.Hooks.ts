"use client";

// BDDiagram.Hooks — Dexie live queries for diagrams.

import { useLiveQuery } from "dexie-react-hooks";
import { bdDB } from "../../BDDatabase";
import type { BDDiagramGroup, BDDiagramRecord } from "../../BDDomain.Types";

export function useBDDiagrams(
  projectId: string,
): BDDiagramRecord[] | undefined {
  return useLiveQuery(
    () => bdDB.diagrams.where("projectId").equals(projectId).toArray(),
    [projectId],
  );
}

/** Diagram groups for a project, ordered by position. */
export function useBDDiagramGroups(
  projectId: string,
): BDDiagramGroup[] | undefined {
  return useLiveQuery(async () => {
    const rows = await bdDB.diagramGroups
      .where("projectId")
      .equals(projectId)
      .toArray();
    return rows.sort((a, b) => a.position - b.position);
  }, [projectId]);
}

/** Diagrams in a group, ordered by name. */
export function useBDDiagramsByGroup(
  groupId: string | undefined,
): BDDiagramRecord[] | undefined {
  return useLiveQuery(async () => {
    if (!groupId) return [];
    const rows = await bdDB.diagrams.where("groupId").equals(groupId).toArray();
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [groupId]);
}

/** A single diagram by id. */
export function useBDDiagram(
  diagramId: string | undefined,
): BDDiagramRecord | null | undefined {
  return useLiveQuery(async () => {
    if (!diagramId) return null;
    return (await bdDB.diagrams.get(diagramId)) ?? null;
  }, [diagramId]);
}
