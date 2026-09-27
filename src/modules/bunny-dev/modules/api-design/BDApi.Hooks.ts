"use client";

// BDApi.Hooks — Dexie live queries for API specs.

import { useLiveQuery } from "dexie-react-hooks";
import { bdDB } from "../../BDDatabase";
import type { BDAPI } from "../../BDDomain.Types";

export function useBDApis(projectId: string): BDAPI[] | undefined {
  return useLiveQuery(
    () => bdDB.apiSpecs.where("projectId").equals(projectId).toArray(),
    [projectId],
  );
}
