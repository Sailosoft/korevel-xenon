"use client";

// BDDoc.Hooks — Dexie live queries for docs.

import { useLiveQuery } from "dexie-react-hooks";
import { bdDB } from "../../BDDatabase";
import type { BDDoc } from "../../BDDomain.Types";

export function useBDDocs(projectId: string): BDDoc[] | undefined {
  return useLiveQuery(
    () => bdDB.docs.where("projectId").equals(projectId).toArray(),
    [projectId],
  );
}

/** undefined = loading, null = not found, otherwise the doc. */
export function useBDDoc(
  id: string,
): BDDoc | null | undefined {
  return useLiveQuery(async () => {
    const record = await bdDB.docs.get(id);
    return record ?? null;
  }, [id]);
}
