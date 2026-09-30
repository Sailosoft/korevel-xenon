// BDDatabase.ts
//
// BDDatabase — the local-first IndexedDB persistence layer for Bunny Developer.
//
// BunnyDev talks to Dexie directly (locked decision #4): no PhazeDB wrapper.
// Every table is a typed `Table<TRow, string>` with a matching generic
// BDRepository instance. Cross-table integrity is enforced with Dexie
// `hook("deleting", …)` cascades so deleting an aggregate root never leaves
// orphaned children behind.

import Dexie, { type Table } from "dexie";
import type { HelixAISettings } from "@/src/modules/helix";
import type {
  BDAPI,
  BDApiGroup,
  BDApp,
  BDAppRecord,
  BDAttachment,
  BDAgent,
  BDAgentHandoff,
  BDAgentRun,
  BDAgentTask,
  BDArchitectureRecord,
  BDBatchProposal,
  BDBoard,
  BDBoardColumn,
  BDBoardTask,
  BDComponent,
  BDDiagramRecord,
  BDGenerationRun,
  BDIssueLink,
  BDLabel,
  BDOutline,
  BDProject,
  BDProjectFile,
  BDProjectFolder,
  BDProjectMember,
  BDSchemaGroup,
  BDSchemaModel,
  BDSprint,
  BDTaskComment,
  BDVersion,
  BDWorkflow,
} from "./BDDomain.Types";
import { configureBDMigrations } from "./BDMigration";
import { BDRepository } from "./BDRepository";

export class BDDatabase extends Dexie {
  // ── Project core ────────────────────────────────────────────────────────
  public projects!: Table<BDProject, string>;
  public projectMembers!: Table<BDProjectMember, string>;
  public labels!: Table<BDLabel, string>;
  public components!: Table<BDComponent, string>;
  public versions!: Table<BDVersion, string>;
  public sprints!: Table<BDSprint, string>;
  public workflows!: Table<BDWorkflow, string>;

  // ── Board ───────────────────────────────────────────────────────────────
  public boards!: Table<BDBoard, string>;
  public boardColumns!: Table<BDBoardColumn, string>;
  public boardTasks!: Table<BDBoardTask, string>;
  public taskComments!: Table<BDTaskComment, string>;
  public issueLinks!: Table<BDIssueLink, string>;
  public attachments!: Table<BDAttachment, string>;

  // ── Agents ──────────────────────────────────────────────────────────────
  public agents!: Table<BDAgent, string>;
  public agentTasks!: Table<BDAgentTask, string>;
  public agentRuns!: Table<BDAgentRun, string>;
  public agentHandoffs!: Table<BDAgentHandoff, string>;

  // ── AI ──────────────────────────────────────────────────────────────────
  public aiSettings!: Table<HelixAISettings, string>;
  public generationRuns!: Table<BDGenerationRun, string>;
  public batchProposals!: Table<BDBatchProposal, string>;

  // ── Aggregate roots (inline deep config) ─────────────────────────────────
  public schemaGroups!: Table<BDSchemaGroup, string>;
  public schemaModels!: Table<BDSchemaModel, string>;
  public apps!: Table<BDApp, string>;
  public appRecords!: Table<BDAppRecord, string>;
  public apiGroups!: Table<BDApiGroup, string>;
  public apiSpecs!: Table<BDAPI, string>;
  public diagrams!: Table<BDDiagramRecord, string>;
  public outlines!: Table<BDOutline, string>;
  public architectures!: Table<BDArchitectureRecord, string>;

  // ── Virtual file system ──────────────────────────────────────────────────
  public projectFolders!: Table<BDProjectFolder, string>;
  public projectFiles!: Table<BDProjectFile, string>;

  // ── Repositories ─────────────────────────────────────────────────────────
  public projectsRepo: BDRepository<BDProject>;
  public projectMembersRepo: BDRepository<BDProjectMember>;
  public labelsRepo: BDRepository<BDLabel>;
  public componentsRepo: BDRepository<BDComponent>;
  public versionsRepo: BDRepository<BDVersion>;
  public sprintsRepo: BDRepository<BDSprint>;
  public workflowsRepo: BDRepository<BDWorkflow>;
  public boardsRepo: BDRepository<BDBoard>;
  public boardColumnsRepo: BDRepository<BDBoardColumn>;
  public boardTasksRepo: BDRepository<BDBoardTask>;
  public taskCommentsRepo: BDRepository<BDTaskComment>;
  public issueLinksRepo: BDRepository<BDIssueLink>;
  public attachmentsRepo: BDRepository<BDAttachment>;
  public agentsRepo: BDRepository<BDAgent>;
  public agentTasksRepo: BDRepository<BDAgentTask>;
  public agentRunsRepo: BDRepository<BDAgentRun>;
  public agentHandoffsRepo: BDRepository<BDAgentHandoff>;
  public generationRunsRepo: BDRepository<BDGenerationRun>;
  public batchProposalsRepo: BDRepository<BDBatchProposal>;
  public schemaGroupsRepo: BDRepository<BDSchemaGroup>;
  public schemaModelsRepo: BDRepository<BDSchemaModel>;
  public appsRepo: BDRepository<BDApp>;
  public appRecordsRepo: BDRepository<BDAppRecord>;
  public apiGroupsRepo: BDRepository<BDApiGroup>;
  public apiSpecsRepo: BDRepository<BDAPI>;
  public diagramsRepo: BDRepository<BDDiagramRecord>;
  public outlinesRepo: BDRepository<BDOutline>;
  public architecturesRepo: BDRepository<BDArchitectureRecord>;
  public projectFoldersRepo: BDRepository<BDProjectFolder>;
  public projectFilesRepo: BDRepository<BDProjectFile>;

  constructor() {
    super("BunnyDevDB");

    configureBDMigrations(this);

    this.projects = this.table("projects");
    this.projectMembers = this.table("projectMembers");
    this.labels = this.table("labels");
    this.components = this.table("components");
    this.versions = this.table("versions");
    this.sprints = this.table("sprints");
    this.workflows = this.table("workflows");
    this.boards = this.table("boards");
    this.boardColumns = this.table("boardColumns");
    this.boardTasks = this.table("boardTasks");
    this.taskComments = this.table("taskComments");
    this.issueLinks = this.table("issueLinks");
    this.attachments = this.table("attachments");
    this.agents = this.table("agents");
    this.agentTasks = this.table("agentTasks");
    this.agentRuns = this.table("agentRuns");
    this.agentHandoffs = this.table("agentHandoffs");
    this.aiSettings = this.table("aiSettings");
    this.generationRuns = this.table("generationRuns");
    this.batchProposals = this.table("batchProposals");
    this.schemaGroups = this.table("schemaGroups");
    this.schemaModels = this.table("schemaModels");
    this.apps = this.table("apps");
    this.appRecords = this.table("appRecords");
    this.apiGroups = this.table("apiGroups");
    this.apiSpecs = this.table("apiSpecs");
    this.diagrams = this.table("diagrams");
    this.outlines = this.table("outlines");
    this.architectures = this.table("architectures");
    this.projectFolders = this.table("projectFolders");
    this.projectFiles = this.table("projectFiles");

    this.projectsRepo = new BDRepository(this.projects);
    this.projectMembersRepo = new BDRepository(this.projectMembers);
    this.labelsRepo = new BDRepository(this.labels);
    this.componentsRepo = new BDRepository(this.components);
    this.versionsRepo = new BDRepository(this.versions);
    this.sprintsRepo = new BDRepository(this.sprints);
    this.workflowsRepo = new BDRepository(this.workflows);
    this.boardsRepo = new BDRepository(this.boards);
    this.boardColumnsRepo = new BDRepository(this.boardColumns);
    this.boardTasksRepo = new BDRepository(this.boardTasks);
    this.taskCommentsRepo = new BDRepository(this.taskComments);
    this.issueLinksRepo = new BDRepository(this.issueLinks);
    this.attachmentsRepo = new BDRepository(this.attachments);
    this.agentsRepo = new BDRepository(this.agents);
    this.agentTasksRepo = new BDRepository(this.agentTasks);
    this.agentRunsRepo = new BDRepository(this.agentRuns);
    this.agentHandoffsRepo = new BDRepository(this.agentHandoffs);
    this.generationRunsRepo = new BDRepository(this.generationRuns);
    this.batchProposalsRepo = new BDRepository(this.batchProposals);
    this.schemaGroupsRepo = new BDRepository(this.schemaGroups);
    this.schemaModelsRepo = new BDRepository(this.schemaModels);
    this.appsRepo = new BDRepository(this.apps);
    this.appRecordsRepo = new BDRepository(this.appRecords);
    this.apiGroupsRepo = new BDRepository(this.apiGroups);
    this.apiSpecsRepo = new BDRepository(this.apiSpecs);
    this.diagramsRepo = new BDRepository(this.diagrams);
    this.outlinesRepo = new BDRepository(this.outlines);
    this.architecturesRepo = new BDRepository(this.architectures);
    this.projectFoldersRepo = new BDRepository(this.projectFolders);
    this.projectFilesRepo = new BDRepository(this.projectFiles);

    this.registerCascades();
  }

  /**
   * Every table that carries a `projectId` index. Deleting a project wipes all
   * of them so no sub-module data survives its project.
   */
  private static readonly PROJECT_SCOPED_TABLES = [
    "projectMembers",
    "labels",
    "components",
    "versions",
    "sprints",
    "workflows",
    "boards",
    "boardTasks",
    "attachments",
    "agents",
    "agentTasks",
    "agentRuns",
    "agentHandoffs",
    "generationRuns",
    "batchProposals",
    "schemaGroups",
    "schemaModels",
    "apps",
    "appRecords",
    "apiGroups",
    "apiSpecs",
    "diagrams",
    "outlines",
    "architectures",
    "projectFolders",
    "projectFiles",
  ];

  private registerCascades(): void {
    // Project → every project-scoped table (nested hooks handle grandchildren).
    this.projects.hook("deleting", (pk) => {
      for (const name of BDDatabase.PROJECT_SCOPED_TABLES) {
        void this.table(name).where("projectId").equals(pk).delete();
      }
    });

    // Board → its columns and tasks (tasks cascade into comments/links).
    this.boards.hook("deleting", (pk) => {
      void this.boardColumns.where("boardId").equals(pk).delete();
      void this.boardTasks.where("boardId").equals(pk).delete();
    });

    // Task → comments and issue links.
    this.boardTasks.hook("deleting", (pk) => {
      void this.taskComments.where("taskId").equals(pk).delete();
      void this.issueLinks.where("taskId").equals(pk).delete();
    });

    // Schema group → its models.
    this.schemaGroups.hook("deleting", (pk) => {
      void this.schemaModels.where("groupId").equals(pk).delete();
    });

    // API group → its operations.
    this.apiGroups.hook("deleting", (pk) => {
      void this.apiSpecs.where("groupId").equals(pk).delete();
    });

    // Folder → child folders and files.
    this.projectFolders.hook("deleting", (pk) => {
      void this.projectFolders.where("parentId").equals(pk).delete();
      void this.projectFiles.where("folderId").equals(pk).delete();
    });

    // Agent → its tasks and handoffs.
    this.agents.hook("deleting", (pk) => {
      void this.agentTasks.where("agentId").equals(pk).delete();
      void this.agentHandoffs.where("agentId").equals(pk).delete();
    });
  }
}

export const bdDB = new BDDatabase();
