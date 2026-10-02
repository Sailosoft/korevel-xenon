"use client";

// BDDiagram.Hooks — Dexie live queries for diagrams.

import { useLiveQuery } from "dexie-react-hooks";
import { bdDB } from "../../BDDatabase";
import type { BDDiagramRecord } from "../../BDDomain.Types";

export function useBDDiagrams(
  projectId: string,
): BDDiagramRecord[] | undefined {
  return useLiveQuery(
    () => bdDB.diagrams.where("projectId").equals(projectId).toArray(),
    [projectId],
  );
}
