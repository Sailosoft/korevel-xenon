// BDMigration.ts
//
// Versioned Dexie schema for BDDatabase.
//
// Each `db.version(n).stores({...})` call is a sequential IndexedDB schema
// version. Dexie applies them in order so existing local databases upgrade
// without data loss. `.upgrade()` backfills run inside the version transaction
// when a field needs to be derived for pre-existing rows.

import type Dexie from "dexie";

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
}
