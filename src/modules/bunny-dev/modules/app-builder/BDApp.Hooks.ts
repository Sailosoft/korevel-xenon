"use client";

// BDApp.Hooks — Dexie live queries for generated apps and their rows.

import { useLiveQuery } from "dexie-react-hooks";
import { bdDB } from "../../BDDatabase";
import type { BDApp, BDAppRecord, BDSchemaModel } from "../../BDDomain.Types";

export function useBDApps(projectId: string): BDApp[] | undefined {
  return useLiveQuery(
    () => bdDB.apps.where("projectId").equals(projectId).toArray(),
    [projectId],
  );
}

export function useBDApp(appId: string): BDApp | null | undefined {
  return useLiveQuery(
    async () => (await bdDB.apps.get(appId)) ?? null,
    [appId],
  );
}

export function useBDAppRecords(
  appId: string,
  resourceSlug: string,
): BDAppRecord[] | undefined {
  return useLiveQuery(async () => {
    const rows = await bdDB.appRecords.where("appId").equals(appId).toArray();
    return rows.filter((row) => row.resourceSlug === resourceSlug);
  }, [appId, resourceSlug]);
}

/** Schema models for a project (relation option sources). */
export function useBDProjectSchemaModels(
  projectId: string,
): BDSchemaModel[] | undefined {
  return useLiveQuery(
    () => bdDB.schemaModels.where("projectId").equals(projectId).toArray(),
    [projectId],
  );
}
