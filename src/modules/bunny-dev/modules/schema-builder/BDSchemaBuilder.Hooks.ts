"use client";

// BDSchemaBuilder.Hooks — Dexie live queries for schema groups and models.

import { useLiveQuery } from "dexie-react-hooks";
import { bdDB } from "../../BDDatabase";
import type { BDSchemaGroup, BDSchemaModel } from "../../BDDomain.Types";

/** Schema groups for a project, ordered by position. */
export function useBDSchemaGroups(
  projectId: string,
): BDSchemaGroup[] | undefined {
  return useLiveQuery(async () => {
    const rows = await bdDB.schemaGroups
      .where("projectId")
      .equals(projectId)
      .toArray();
    return rows.sort((a, b) => a.position - b.position);
  }, [projectId]);
}

/** Models in a group, ordered by name. */
export function useBDSchemaModels(
  groupId: string | undefined,
): BDSchemaModel[] | undefined {
  return useLiveQuery(async () => {
    if (!groupId) return [];
    const rows = await bdDB.schemaModels.where("groupId").equals(groupId).toArray();
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [groupId]);
}

/** A single model by id. */
export function useBDSchemaModel(
  modelId: string | undefined,
): BDSchemaModel | null | undefined {
  return useLiveQuery(async () => {
    if (!modelId) return null;
    return (await bdDB.schemaModels.get(modelId)) ?? null;
  }, [modelId]);
}
