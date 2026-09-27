"use client";

// BDOutline.Hooks — Dexie live queries for outlines.

import { useLiveQuery } from "dexie-react-hooks";
import { bdDB } from "../../BDDatabase";
import type { BDOutline } from "../../BDDomain.Types";

export function useBDOutlines(projectId: string): BDOutline[] | undefined {
  return useLiveQuery(
    () => bdDB.outlines.where("projectId").equals(projectId).toArray(),
    [projectId],
  );
}
