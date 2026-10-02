"use client";

// BDFile.Hooks — Dexie live queries for the virtual file system.

import { useLiveQuery } from "dexie-react-hooks";
import { bdDB } from "../../BDDatabase";
import type { BDProjectFile, BDProjectFolder } from "../../BDDomain.Types";

export function useBDFolders(
  projectId: string,
): BDProjectFolder[] | undefined {
  return useLiveQuery(async () => {
    const rows = await bdDB.projectFolders
      .where("projectId")
      .equals(projectId)
      .toArray();
    return rows.sort(
      (a, b) => a.position - b.position || a.name.localeCompare(b.name),
    );
  }, [projectId]);
}

export function useBDFiles(projectId: string): BDProjectFile[] | undefined {
  return useLiveQuery(async () => {
    const rows = await bdDB.projectFiles
      .where("projectId")
      .equals(projectId)
      .toArray();
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [projectId]);
}
