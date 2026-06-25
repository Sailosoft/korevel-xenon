// ─── BFlow Module Barrel Export ─────────────────────────────────

// Adapters
export {
  createBFlowZodAdapter,
  BFlowDefinitionFormSchema,
  BFlowWorkflowTemplateFormSchema,
  BFlowPipelineFormSchema,
  BFlowVariableGroupFormSchema,
  BFlowGlobalVariableFormSchema,
  BFlowFlowVariableFormSchema,
  BFlowReportTemplateFormSchema,
  useBFlowDefinitionFormValidation,
  useBFlowWorkflowFormValidation,
  useBFlowPipelineFormValidation,
  useBFlowVariableGroupFormValidation,
  useBFlowGlobalVariableFormValidation,
  useBFlowFlowVariableFormValidation,
  useBFlowReportTemplateFormValidation,
} from "./adapters";
export type {
  BFlowDefinitionForm,
  BFlowWorkflowTemplateForm,
  BFlowPipelineForm,
  BFlowVariableGroupForm,
  BFlowGlobalVariableForm,
  BFlowFlowVariableForm,
  BFlowReportTemplateForm,
} from "./adapters";

// Types
export type { BFlowDefinitionEntity } from "./definition/BFlowDefinition.Types";
export type { BFlowWorkflowTemplateEntity } from "./workflow/BFlowWorkflow.Entity";
export type {
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

// AI Config Types
export type {
  BFlowGlobalAIConfigEntity,
  BFlowFlowAIConfigEntity,
  BFlowPipelineAIConfigEntity,
  BFlowAIConfigValue,
  BFlowJobAIConfig,
  BFlowResolvedAIConfig,
  BFlowAnyAIConfigEntity,
  BFlowGlobalAIConfigForm,
  BFlowFlowAIConfigForm,
  BFlowPipelineAIConfigForm,
} from "./ai-config/BFlowAIConfig.Types";
export {
  BFlowGlobalAIConfigFormSchema,
  BFlowFlowAIConfigFormSchema,
  BFlowPipelineAIConfigFormSchema,
} from "./ai-config/BFlowAIConfig.Types";

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

// AI Config Modules
export { bflowGlobalAIConfigModule } from "./ai-config/BFlowGlobalAIConfig";
export { bflowFlowAIConfigModule } from "./ai-config/BFlowFlowAIConfig";
export { bflowPipelineAIConfigModule } from "./ai-config/BFlowPipelineAIConfig";

// Components
export { default as BFlowDefinitionComponent } from "./definition/BFlowDefinition.Component";
export { default as BFlowWorkflowComponent } from "./workflow/BFlowWorkflow.Component";
export { default as BFlowPipelineComponent } from "./pipeline/BFlowPipeline.Component";
export { default as BFlowReportComponent } from "./report/BFlowReport.Component";
export { default as BFlowVariableGroupComponent } from "./variable/BFlowVariableGroup.Component";
export { default as BFlowGlobalVariableComponent } from "./global-variable/BFlowGlobalVariable.Component";
export { default as BFlowFlowVariableComponent } from "./flow-variable/BFlowFlowVariable.Component";
export { default as BFlowScopedFlowVariables } from "./flow-variable/BFlowScopedFlowVariables";

// AI Config Components
export {
  BFlowGlobalAIConfigComponent,
  BFlowFlowAIConfigComponent,
  BFlowPipelineAIConfigComponent,
} from "./ai-config/BFlowAIConfig.Component";

// Scoped AI Config Components
export { default as BFlowScopedFlowAIConfig } from "./ai-config/BFlowScopedFlowAIConfig";
export { default as BFlowScopedPipelineAIConfig } from "./ai-config/BFlowScopedPipelineAIConfig";

// Helix Integration
export {
  createHelixFromBFlow,
  resolveBFlowAIOption,
} from "./ai-config/BFlowHelixIntegration";

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

// AI Config Repositories
export {
  BFlowGlobalAIConfigRepository,
  BFlowFlowAIConfigRepository,
  BFlowPipelineAIConfigRepository,
  BFlowAIConfigResolver,
} from "./ai-config/BFlowAIConfig.Repository";

// Pipeline Run
export type {
  BFlowPipelineRunEntity,
  BFlowJobRun,
  BFlowStepRun,
  BFlowRunStatus,
  BFlowPipelineRunSummary,
} from "./run/BFlowRun.Types";
export {
  BFlowPipelineRunRepository,
  BFlowJobRunRepository,
  BFlowStepRunRepository,
} from "./run/BFlowRun.Repository";
export { default as BFlowRunComponent } from "./run/BFlowRun.Component";

// AI Engine
export { BFlowAIEngine, bflowAIEngine } from "./ai/BFlowAIEngine";

// Export Service
export {
  BFlowExportService,
  bflowExportService,
} from "./export/BFlowExport.Service";
export type {
  BFlowExportFormat,
  BFlowExportOptions,
  BFlowExportInput,
} from "./export/BFlowExport.Service";
