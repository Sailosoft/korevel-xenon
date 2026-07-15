import PhazeDB, { IPhazeModelBuilder } from "@/src/modules/phaze/src/PhazeDB";
import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import { BFlowDefinitionEntity } from "../definition/BFlowDefinition.Types";
import { BFlowDefinitionRepository } from "../definition/BFlowDefinition.Repository";
import { BFlowWorkflowTemplateEntity } from "../workflow/BFlowWorkflow.Entity";
import { BFlowWorkflowRepository } from "../workflow/BFlowWorkflow.Repository";
import {
  BFlowPipelineEntity,
  BFlowPipelineStoreEntity,
  BFlowPipelineStoreDataEntity,
} from "../pipeline/BFlowPipeline.Types";
import { BFlowPipelineRepository } from "../pipeline/BFlowPipeline.Repository";
import {
  BFlowReportTemplateEntity,
  BFlowPipelineReportEntity,
  BFlowReportSnapshotEntity,
} from "../report/BFlowReport.Types";
import { BFlowReportRepository } from "../report/BFlowReport.Repository";
import { BFlowVariableGroupEntity } from "../variable/BFlowVariableGroup.Types";
import { BFlowVariableGroupRepository } from "../variable/BFlowVariableGroup.Repository";
import { BFlowGlobalVariableEntity } from "../global-variable/BFlowGlobalVariable.Types";
import { BFlowGlobalVariableRepository } from "../global-variable/BFlowGlobalVariable.Repository";
import { BFlowFlowVariableEntity } from "../flow-variable/BFlowFlowVariable.Types";
import { BFlowFlowVariableRepository } from "../flow-variable/BFlowFlowVariable.Repository";

// Pipeline Run imports
import {
  BFlowPipelineRunEntity,
  BFlowJobRun,
  BFlowStepRun,
} from "../run/BFlowRun.Types";
import {
  BFlowPipelineRunRepository,
  BFlowJobRunRepository,
  BFlowStepRunRepository,
} from "../run/BFlowRun.Repository";

// AI Config imports
import {
  BFlowGlobalAIConfigEntity,
  BFlowFlowAIConfigEntity,
  BFlowPipelineAIConfigEntity,
} from "../ai-config/BFlowAIConfig.Types";
import {
  BFlowGlobalAIConfigRepository,
  BFlowFlowAIConfigRepository,
  BFlowPipelineAIConfigRepository,
  BFlowAIConfigResolver,
} from "../ai-config/BFlowAIConfig.Repository";

import { configureBFlowMigrations } from "./BFlowMigration";

// Pool imports
import { BFlowPoolEntity } from "../pool/BFlowPool.Types";
import { BFlowPoolRepository } from "../pool/BFlowPool.Repository";

// Pool Agent imports
import { BFlowPoolAgentEntity } from "../pool/BFlowPoolAgent.Types";
import { BFlowPoolAgentRepository } from "../pool/BFlowPoolAgent.Repository";

/**
 * BFlowDatabase — IndexedDB persistence layer for BunnyFlow.
 *
 * Uses the PhazeDB abstraction over Dexie to manage local IndexedDB stores
 * for all flow entities: definitions, workflow templates, pipelines, reports,
 * variable groups, and pipeline runs.
 *
 * Each table is backed by a typed repository (PhazeRepository) exposing
 * CRUD + query operations with GUIDv7 support.
 */
export class BFlowDatabase extends PhazeDB {
  /** Flow Definitions — blueprint / container for pipelines */
  public definitions = this.table<BFlowDefinitionEntity, string>("definitions");
  public definitionsRepo = new BFlowDefinitionRepository(this.definitions);

  /** Workflow Templates — YAML-based pipeline templates */
  public workflowTemplates = this.table<BFlowWorkflowTemplateEntity, string>(
    "workflowTemplates",
  );
  public workflowTemplatesRepo = new BFlowWorkflowRepository(
    this.workflowTemplates,
  );

  /** Pipelines — scheduled / running / completed pipeline instances */
  public pipelines = this.table<BFlowPipelineEntity, string>("pipelines");
  public pipelinesRepo = new BFlowPipelineRepository(this.pipelines);

  /** Pipeline Stores — ephemeral per-pipeline output store */
  public pipelineStores = this.table<BFlowPipelineStoreEntity, string>(
    "pipelineStores",
  );
  public pipelineStoresRepo = new PhazeRepository(this.pipelineStores);

  /** Pipeline Store Data — key-value step output store */
  public pipelineStoreData = this.table<BFlowPipelineStoreDataEntity, string>(
    "pipelineStoreData",
  );
  public pipelineStoreDataRepo = new PhazeRepository(this.pipelineStoreData);

  /** Report Templates — report configurations */
  public reportTemplates = this.table<BFlowReportTemplateEntity, string>(
    "reportTemplates",
  );
  public reportTemplatesRepo = new BFlowReportRepository(this.reportTemplates);

  /** Pipeline Reports — generated report instances */
  public pipelineReports = this.table<BFlowPipelineReportEntity, string>(
    "pipelineReports",
  );
  public pipelineReportsRepo = new PhazeRepository(this.pipelineReports);

  /** Report Snapshots — report snapshot data */
  public reportSnapshots = this.table<BFlowReportSnapshotEntity, string>(
    "reportSnapshots",
  );
  public reportSnapshotsRepo = new PhazeRepository(this.reportSnapshots);

  /** Variable Groups — collections of variables per flow */
  public variableGroups = this.table<BFlowVariableGroupEntity, string>(
    "variableGroups",
  );
  public variableGroupsRepo = new BFlowVariableGroupRepository(
    this.variableGroups,
  );

  /** Global Variables — variables available across all flows */
  public globalVariables = this.table<BFlowGlobalVariableEntity, string>(
    "globalVariables",
  );
  public globalVariablesRepo = new BFlowGlobalVariableRepository(
    this.globalVariables,
  );

  /** Flow Variables — individual variables within a variable group */
  public flowVariables = this.table<BFlowFlowVariableEntity, string>(
    "flowVariables",
  );
  public flowVariablesRepo = new BFlowFlowVariableRepository(
    this.flowVariables,
  );

  // ── Pipeline Run Tables ──────────────────────────────────────────

  /** Pipeline Runs — tracks overall pipeline execution */
  public pipelineRuns = this.table<BFlowPipelineRunEntity, string>(
    "pipelineRuns",
  );
  public pipelineRunsRepo = new BFlowPipelineRunRepository(this.pipelineRuns);

  /** Job Runs — tracks individual job execution within a pipeline run */
  public jobRuns = this.table<BFlowJobRun, string>("jobRuns");
  public jobRunsRepo = new BFlowJobRunRepository(this.jobRuns);

  /** Step Runs — tracks individual step execution within a job run */
  public stepRuns = this.table<BFlowStepRun, string>("stepRuns");
  public stepRunsRepo = new BFlowStepRunRepository(this.stepRuns);

  // ── AI Config Tables ─────────────────────────────────────────────

  /** Global AI Config — AI configuration across all flows */
  public globalAIConfig = this.table<BFlowGlobalAIConfigEntity, string>(
    "globalAIConfig",
  );
  public globalAIConfigRepo = new BFlowGlobalAIConfigRepository(
    this.globalAIConfig,
  );

  /** Flow AI Config — AI configuration per flow definition */
  public flowAIConfig = this.table<BFlowFlowAIConfigEntity, string>(
    "flowAIConfig",
  );
  public flowAIConfigRepo = new BFlowFlowAIConfigRepository(this.flowAIConfig);

  /** Pipeline AI Config — AI configuration per pipeline */
  public pipelineAIConfig = this.table<BFlowPipelineAIConfigEntity, string>(
    "pipelineAIConfig",
  );
  public pipelineAIConfigRepo = new BFlowPipelineAIConfigRepository(
    this.pipelineAIConfig,
  );

  /** Pools — groups of AI agents scoped to a flow */
  public pools = this.table<BFlowPoolEntity, string>("pools");
  public poolsRepo = new BFlowPoolRepository(this.pools);

  /** Pool Agents — individual agents belonging to a pool */
  public poolAgents = this.table<BFlowPoolAgentEntity, string>("poolAgents");
  public poolAgentsRepo = new BFlowPoolAgentRepository(this.poolAgents);

  protected dbName(): string {
    return "BunnyFlowDB";
  }

  protected onModelCreating(model: IPhazeModelBuilder): void {
    configureBFlowMigrations(model);
  }
}

export const bflowDB = new BFlowDatabase();
