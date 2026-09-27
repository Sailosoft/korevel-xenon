"use client";

// BDArchitecture.Hooks — Dexie live queries for architectures.

import { useLiveQuery } from "dexie-react-hooks";
import { bdDB } from "../../BDDatabase";
import type { BDArchitectureRecord } from "../../BDDomain.Types";

export function useBDArchitectures(
  projectId: string,
): BDArchitectureRecord[] | undefined {
  return useLiveQuery(
    () => bdDB.architectures.where("projectId").equals(projectId).toArray(),
    [projectId],
  );
}
