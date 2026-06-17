// ─── BFlow Module Barrel Export ─────────────────────────────────

// Types
export type { BFlowDefinitionEntity } from "./definition/BFlowDefinition.Types";
export type {
  BFlowWorkflowTemplateEntity,
  BFlowWorkflow,
  BFlowWorkflowJob,
  BFlowWorkflowAgent,
  BFlowStep,
  BFlowVariable,
  BFlowVariableType,
  BFlowStepOutputType,
} from "./workflow/BFlowWorkflow.Types";
export type {
  BFlowPipelineEntity,
  BFlowPipelineStoreEntity,
  BFlowPipelineStoreDataEntity,
  BFlowPipelineVariable,
  BFlowPipelineStatus,
} from "./pipeline/BFlowPipeline.Types";
export type {
  BFlowReportTemplateEntity,
  BFlowPipelineReportEntity,
  BFlowReportSnapshotEntity,
  BFlowReport,
  BFlowReportMode,
} from "./report/BFlowReport.Types";
export type { BFlowVariableGroupEntity } from "./variable/BFlowVariableGroup.Types";
export type { BFlowGlobalVariableEntity } from "./global-variable/BFlowGlobalVariable.Types";
export type { BFlowFlowVariableEntity } from "./flow-variable/BFlowFlowVariable.Types";

// DB
export { BFlowDatabase } from "./database/BFlowDatabase";

// Modules (BunnyConfig)
export { bflowDefinitionModule } from "./definition/BFlowDefinition";
export { bflowWorkflowModule } from "./workflow/BFlowWorkflow";
export { bflowPipelineModule } from "./pipeline/BFlowPipeline";
export { bflowReportModule } from "./report/BFlowReport";
export { bflowVariableGroupModule } from "./variable/BFlowVariableGroup";
export { bflowGlobalVariableModule } from "./global-variable/BFlowGlobalVariable";
export { bflowFlowVariableModule } from "./flow-variable/BFlowFlowVariable";

// Components
export { default as BFlowDefinitionComponent } from "./definition/BFlowDefinition.Component";
export { default as BFlowWorkflowComponent } from "./workflow/BFlowWorkflow.Component";
export { default as BFlowPipelineComponent } from "./pipeline/BFlowPipeline.Component";
export { default as BFlowReportComponent } from "./report/BFlowReport.Component";
export { default as BFlowVariableGroupComponent } from "./variable/BFlowVariableGroup.Component";
export { default as BFlowGlobalVariableComponent } from "./global-variable/BFlowGlobalVariable.Component";
export { default as BFlowFlowVariableComponent } from "./flow-variable/BFlowFlowVariable.Component";
export { default as BFlowScopedFlowVariables } from "./flow-variable/BFlowScopedFlowVariables";

// Scoped flow components (Bunny-backed, auto-filtered by definitionId)
export { default as BFlowScopedWorkflows } from "./flow/BFlowScopedWorkflows";
export { default as BFlowScopedPipelines } from "./flow/BFlowScopedPipelines";
export { default as BFlowScopedReports } from "./flow/BFlowScopedReports";
export { default as BFlowScopedVariables } from "./flow/BFlowScopedVariables";
export { createScopedBunnyConfig } from "./flow/BFlowScopedModule";

// Dashboard
export { default as BFlowDashboard } from "./dashboard/BFlowDashboard";

// Repositories
export { BFlowDefinitionRepository } from "./definition/BFlowDefinition.Repository";
export { BFlowWorkflowRepository } from "./workflow/BFlowWorkflow.Repository";
export { BFlowPipelineRepository } from "./pipeline/BFlowPipeline.Repository";
export { BFlowReportRepository } from "./report/BFlowReport.Repository";
export { BFlowVariableGroupRepository } from "./variable/BFlowVariableGroup.Repository";
export { BFlowGlobalVariableRepository } from "./global-variable/BFlowGlobalVariable.Repository";
export { BFlowFlowVariableRepository } from "./flow-variable/BFlowFlowVariable.Repository";
