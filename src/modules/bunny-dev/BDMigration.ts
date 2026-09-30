// BDMigration.ts
//
// Versioned Dexie schema for BDDatabase.
//
// Each `db.version(n).stores({...})` call is a sequential IndexedDB schema
// version. Dexie applies them in order so existing local databases upgrade
// without data loss. `.upgrade()` backfills run inside the version transaction
// when a field needs to be derived for pre-existing rows.

import type Dexie from "dexie";
import { v7 as uuidv7 } from "uuid";
import type { BDAPI, BDApiGroup } from "./BDDomain.Types";

/**
 * Register every schema version on the given Dexie instance.
 *
 * Kept separate from BDDatabase so the store/index list is easy to read and a
 * new version is an isolated addition rather than an edit to the class body.
 */
export function configureBDMigrations(db: Dexie): void {
  // ── Version 1 — initial schema ───────────────────────────────────────────
  db.version(1).stores({
    // Project core
    projects: "id, key, name, createdAt",
    projectMembers: "id, projectId, email",
    labels: "id, projectId, name",
    components: "id, projectId, name",
    versions: "id, projectId, name",
    sprints: "id, projectId, state",
    workflows: "id, projectId, name",

    // Project management (board)
    boards: "id, projectId, sprintId",
    boardColumns: "id, boardId",
    boardTasks:
      "id, projectId, boardId, sprintId, assigneeId, parentId, status",
    taskComments: "id, taskId",
    issueLinks: "id, taskId, targetId",
    attachments: "id, projectId, taskId",

    // Agents
    agents: "id, projectId, name",
    agentTasks: "id, projectId, taskId, agentId",
    agentRuns: "id, projectId, agentTaskId",
    agentHandoffs: "id, projectId, taskId, agentId",

    // AI settings + generation pipeline
    aiSettings: "key, provider, model",
    generationRuns: "id, projectId, subsystem, status",
    batchProposals: "id, projectId, subsystem, status",

    // Aggregate roots with inline deep config
    schemaGroups: "id, projectId, position",
    schemaModels: "id, projectId, groupId, name",
    apps: "id, projectId, slug",
    appRecords: "id, appId, projectId, resourceSlug",
    apiSpecs: "id, projectId, path",
    diagrams: "id, projectId, type",
    outlines: "id, projectId, slug",
    architectures: "id, projectId, slug, type, status",

    // Virtual file system
    projectFolders: "id, projectId, parentId",
    projectFiles: "id, projectId, folderId, path",
  });

  // ── Version 2 — API Design groups ────────────────────────────────────────
  // Adds the apiGroups aggregate and moves existing operations under a
  // per-project "Default" group so every operation always lives in a group.
  db.version(2).stores({
    apiGroups: "id, projectId, position",
    apiSpecs: "id, projectId, path, groupId",
  }).upgrade(async (tx) => {
    const specs = await tx.table("apiSpecs").toArray();
    if (specs.length === 0) return;

    const now = new Date().toISOString();
    const byProject = new Map<string, BDAPI[]>();
    for (const spec of specs as BDAPI[]) {
      if (spec.groupId) continue;
      const list = byProject.get(spec.projectId);
      if (list) list.push(spec);
      else byProject.set(spec.projectId, [spec]);
    }

    for (const [projectId, rows] of byProject) {
      const group: BDApiGroup = {
        id: uuidv7(),
        projectId,
        name: "Default",
        description: "",
        position: 0,
        createdAt: now,
        updatedAt: now,
      };
      await tx.table("apiGroups").add(group);
      await tx
        .table("apiSpecs")
        .bulkPut(rows.map((r) => ({ ...r, groupId: group.id })));
    }
  });
}
