"use client";

// BDArchitecture.Hooks — Dexie live queries for architectures.

import { useLiveQuery } from "dexie-react-hooks";
import { bdDB } from "../../BDDatabase";
import type {
  BDArchitectureGroup,
  BDArchitectureRecord,
} from "../../BDDomain.Types";

export function useBDArchitectures(
  projectId: string,
): BDArchitectureRecord[] | undefined {
  return useLiveQuery(
    () => bdDB.architectures.where("projectId").equals(projectId).toArray(),
    [projectId],
  );
}

/** Architecture groups for a project, ordered by position. */
export function useBDArchitectureGroups(
  projectId: string,
): BDArchitectureGroup[] | undefined {
  return useLiveQuery(async () => {
    const rows = await bdDB.architectureGroups
      .where("projectId")
      .equals(projectId)
      .toArray();
    return rows.sort((a, b) => a.position - b.position);
  }, [projectId]);
}

/** Documents in a group. */
export function useBDArchitecturesByGroup(
  groupId: string | undefined,
): BDArchitectureRecord[] | undefined {
  return useLiveQuery(async () => {
    if (!groupId) return [];
    return bdDB.architectures.where("groupId").equals(groupId).toArray();
  }, [groupId]);
}
