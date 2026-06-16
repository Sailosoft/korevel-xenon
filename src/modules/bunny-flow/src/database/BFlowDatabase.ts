import PhazeDB, { IPhazeModelBuilder } from "@/src/modules/phaze/src/PhazeDB";
import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import { BFlowDefinitionEntity } from "../definition/BFlowDefinition.Types";
import { BFlowWorkflowTemplateEntity } from "../workflow/BFlowWorkflow.Types";
import {
  BFlowPipelineEntity,
  BFlowPipelineStoreEntity,
  BFlowPipelineStoreDataEntity,
} from "../pipeline/BFlowPipeline.Types";
import {
  BFlowReportTemplateEntity,
  BFlowPipelineReportEntity,
  BFlowReportSnapshotEntity,
} from "../report/BFlowReport.Types";
import { BFlowVariableGroupEntity } from "../variable/BFlowVariableGroup.Types";

export class BFlowDatabase extends PhazeDB {
  // ─── Tables ─────────────────────────────────────────────────────

  /** Flow Definitions */
  public definitions = this.table<BFlowDefinitionEntity, string>("definitions");
  public definitionsRepo = new PhazeRepository(this.definitions);

  /** Workflow Templates */
  public workflowTemplates = this.table<BFlowWorkflowTemplateEntity, string>(
    "workflowTemplates",
  );
  public workflowTemplatesRepo = new PhazeRepository(this.workflowTemplates);

  /** Pipelines */
  public pipelines = this.table<BFlowPipelineEntity, string>("pipelines");
  public pipelinesRepo = new PhazeRepository(this.pipelines);

  /** Pipeline Stores */
  public pipelineStores = this.table<BFlowPipelineStoreEntity, string>(
    "pipelineStores",
  );
  public pipelineStoresRepo = new PhazeRepository(this.pipelineStores);

  /** Pipeline Store Data */
  public pipelineStoreData = this.table<BFlowPipelineStoreDataEntity, string>(
    "pipelineStoreData",
  );
  public pipelineStoreDataRepo = new PhazeRepository(this.pipelineStoreData);

  /** Report Templates */
  public reportTemplates = this.table<BFlowReportTemplateEntity, string>(
    "reportTemplates",
  );
  public reportTemplatesRepo = new PhazeRepository(this.reportTemplates);

  /** Pipeline Reports */
  public pipelineReports = this.table<BFlowPipelineReportEntity, string>(
    "pipelineReports",
  );
  public pipelineReportsRepo = new PhazeRepository(this.pipelineReports);

  /** Report Snapshots */
  public reportSnapshots = this.table<BFlowReportSnapshotEntity, string>(
    "reportSnapshots",
  );
  public reportSnapshotsRepo = new PhazeRepository(this.reportSnapshots);

  /** Variable Groups */
  public variableGroups = this.table<BFlowVariableGroupEntity, string>(
    "variableGroups",
  );
  public variableGroupsRepo = new PhazeRepository(this.variableGroups);

  protected dbName(): string {
    return "BunnyFlowDB";
  }

  protected onModelCreating(model: IPhazeModelBuilder): void {
    model.schema((config) => {
      // Flow Definitions
      config.create("definitions", (table) => {
        table.index("id");
        table.index("code");
        table.index("slug");
        table.index("status");
      });

      // Workflow Templates
      config.create("workflowTemplates", (table) => {
        table.index("id");
        table.index("definitionId");
        table.index("slug");
        table.index("status");
      });

      // Pipelines
      config.create("pipelines", (table) => {
        table.index("id");
        table.index("templateId");
        table.index("flowId");
        table.index("slug");
        table.index("status");
      });

      // Pipeline Stores
      config.create("pipelineStores", (table) => {
        table.index("id");
        table.index("pipelineId");
      });

      // Pipeline Store Data
      config.create("pipelineStoreData", (table) => {
        table.index("id");
        table.index("storeId");
        table.index("key");
      });

      // Report Templates
      config.create("reportTemplates", (table) => {
        table.index("id");
        table.index("workflowId");
        table.index("flowId");
      });

      // Pipeline Reports
      config.create("pipelineReports", (table) => {
        table.index("id");
        table.index("pipelineId");
        table.index("templateId");
        table.index("flowId");
      });

      // Report Snapshots
      config.create("reportSnapshots", (table) => {
        table.index("id");
        table.index("pipelineId");
      });

      // Variable Groups
      config.create("variableGroups", (table) => {
        table.index("id");
        table.index("flowId");
        table.index("slug");
      });
    });
  }
}

let _instance: BFlowDatabase | null = null;

/**
 * Lazily-initialised singleton — safe to call during SSR/build.
 * Returns undefined on the server so modules can guard against it.
 */
export function getBFlowDB(): BFlowDatabase | undefined {
  if (typeof window === "undefined") return undefined;
  if (!_instance) {
    _instance = new BFlowDatabase();
  }
  return _instance;
}

/**
 * Database accessor — returns the singleton or undefined if not in a browser context.
 */
export const bflowDB: BFlowDatabase | undefined =
  typeof window !== "undefined" ? getBFlowDB() : undefined;
