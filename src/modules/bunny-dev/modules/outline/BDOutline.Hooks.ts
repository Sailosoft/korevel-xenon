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

/** undefined = loading, null = not found, otherwise the outline. */
export function useBDOutline(
  id: string,
): BDOutline | null | undefined {
  return useLiveQuery(async () => {
    const record = await bdDB.outlines.get(id);
    return record ?? null;
  }, [id]);
}
