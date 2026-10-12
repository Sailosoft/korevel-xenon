"use client";

// BDSpec.Hooks — Dexie live queries for specs.

import { useLiveQuery } from "dexie-react-hooks";
import { bdDB } from "../../BDDatabase";
import type {
  BDSpecGroup,
  BDSpecRecord,
} from "../../BDDomain.Types";

export function useBDSpecs(
  projectId: string,
): BDSpecRecord[] | undefined {
  return useLiveQuery(
    () => bdDB.specs.where("projectId").equals(projectId).toArray(),
    [projectId],
  );
}

/** Spec groups for a project, ordered by position. */
export function useBDSpecGroups(
  projectId: string,
): BDSpecGroup[] | undefined {
  return useLiveQuery(async () => {
    const rows = await bdDB.specGroups
      .where("projectId")
      .equals(projectId)
      .toArray();
    return rows.sort((a, b) => a.position - b.position);
  }, [projectId]);
}

/** Documents in a group. */
export function useBDSpecsByGroup(
  groupId: string | undefined,
): BDSpecRecord[] | undefined {
  return useLiveQuery(async () => {
    if (!groupId) return [];
    return bdDB.specs.where("groupId").equals(groupId).toArray();
  }, [groupId]);
}
