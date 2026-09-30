"use client";

// BDApi.Hooks — Dexie live queries for API groups and specs.

import { useLiveQuery } from "dexie-react-hooks";
import { bdDB } from "../../BDDatabase";
import type { BDAPI, BDApiGroup } from "../../BDDomain.Types";

export function useBDApis(projectId: string): BDAPI[] | undefined {
  return useLiveQuery(
    () => bdDB.apiSpecs.where("projectId").equals(projectId).toArray(),
    [projectId],
  );
}

/** API groups for a project, ordered by position. */
export function useBDApiGroups(
  projectId: string,
): BDApiGroup[] | undefined {
  return useLiveQuery(async () => {
    const rows = await bdDB.apiGroups
      .where("projectId")
      .equals(projectId)
      .toArray();
    return rows.sort((a, b) => a.position - b.position);
  }, [projectId]);
}
