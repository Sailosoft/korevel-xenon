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
import type {
  BDAPI,
  BDApiGroup,
  BDArchitectureGroup,
  BDArchitectureRecord,
  BDBoard,
  BDDiagramGroup,
  BDDiagramRecord,
} from "./BDDomain.Types";

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

  // ── Version 3 — Board ordering ─────────────────────────────────────────────
  // Adds a `position` index to boards so project-wide ordering is queryable.
  // Pre-existing rows are backfilled deterministically (per project, append
  // after the highest existing position, alphabetical for ties).
  db.version(3)
    .stores({
      boards: "id, projectId, sprintId, position",
    })
    .upgrade(async (tx) => {
      const table = tx.table("boards");
      const boards = (await table.toArray()) as BDBoard[];
      const byProject = new Map<string, BDBoard[]>();
      for (const board of boards) {
        const list = byProject.get(board.projectId);
        if (list) list.push(board);
        else byProject.set(board.projectId, [board]);
      }
      for (const list of byProject.values()) {
        const max = list.reduce(
          (acc, b) => (typeof b.position === "number" ? Math.max(acc, b.position) : acc),
          -1,
        );
        const missing = list
          .filter((b) => typeof b.position !== "number")
          .sort((a, b) => a.name.localeCompare(b.name));
        if (missing.length === 0) continue;
        await table.bulkPut(
          missing.map((b, i) => ({ ...b, position: max + 1 + i })),
        );
      }
    });

  // ── Version 4 — Diagram groups ─────────────────────────────────────────────
  // Adds the diagramGroups aggregate and moves existing diagrams under a
  // per-project "Default" group so every diagram always lives in a group.
  db.version(4)
    .stores({
      diagramGroups: "id, projectId, position",
      diagrams: "id, projectId, type, groupId",
    })
    .upgrade(async (tx) => {
      const diagrams = (await tx.table("diagrams").toArray()) as BDDiagramRecord[];
      if (diagrams.length === 0) return;

      const now = new Date().toISOString();
      const byProject = new Map<string, BDDiagramRecord[]>();
      for (const diagram of diagrams) {
        if (diagram.groupId) continue;
        const list = byProject.get(diagram.projectId);
        if (list) list.push(diagram);
        else byProject.set(diagram.projectId, [diagram]);
      }

      for (const [projectId, rows] of byProject) {
        const group: BDDiagramGroup = {
          id: uuidv7(),
          projectId,
          name: "Default",
          description: "",
          position: 0,
          createdAt: now,
          updatedAt: now,
        };
        await tx.table("diagramGroups").add(group);
        await tx
          .table("diagrams")
          .bulkPut(rows.map((r) => ({ ...r, groupId: group.id })));
      }
    });

  // ── Version 5 — Architecture groups ────────────────────────────────────────
  // Adds the architectureGroups aggregate and moves existing documents under a
  // per-project "Default" group so every document always lives in a group.
  db.version(5)
    .stores({
      architectureGroups: "id, projectId, position",
      architectures: "id, projectId, slug, type, status, groupId",
    })
    .upgrade(async (tx) => {
      const records = (await tx.table("architectures").toArray()) as BDArchitectureRecord[];
      if (records.length === 0) return;

      const now = new Date().toISOString();
      const byProject = new Map<string, BDArchitectureRecord[]>();
      for (const record of records) {
        if (record.groupId) continue;
        const list = byProject.get(record.projectId);
        if (list) list.push(record);
        else byProject.set(record.projectId, [record]);
      }

      for (const [projectId, rows] of byProject) {
        const group: BDArchitectureGroup = {
          id: uuidv7(),
          projectId,
          name: "Default",
          description: "",
          position: 0,
          createdAt: now,
          updatedAt: now,
        };
        await tx.table("architectureGroups").add(group);
        await tx
          .table("architectures")
          .bulkPut(rows.map((r) => ({ ...r, groupId: group.id })));
      }
    });
}
