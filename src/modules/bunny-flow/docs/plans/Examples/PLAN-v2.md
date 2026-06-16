# Bunny Flow V2

## Description

Bunnyflow - is a workflow management for AI tasks and outputs. It used for AI to work together by passing the agent and
capable to read other output of other agents.

It manage the flow definition, workspaces, jobs, agent pools and steps

## Future Scope

Capable to validate by other agents and add looping options that other agent check there output and validate if pass or refactor or ask for user gates. then agents could work again until they polish it in number of times(limit by user settings)

This future scope will not be included here and not yet implemented. This take note for looping steps feature.

## Dependencies

### Internal Module Dependencies

- List of internal project dependencies (other modules that this module depends on).
  - (Bunny)[src\modules\bunny] - For feature building and components
    - (BunnyFeature)[src\modules\bunny\feature] - For easy generation of pages and module management.
  - (AdminPanel)[src\modules\admin-panel] - For headless state management
  - (PhazeDB)[src\modules\phaze] - For dexie wrapper - database management
  - (Helix)[src\modules\helix] - For ai prompting and ai management

## Metadata

- Directory: src\modules\bunny-flow
- SourceCodeDir: src\modules\bunny-flow\src
- Template: src\modules\bunny-ai\docs\Template\BUI_TEMPLATE.md

## Routing

- use nextjs routing appropiate parameter. flow/{id} <- for more specific content tabs.
- Route: src\app\modules\bunny-flow
  - [id].tsx <- for more specific content tabs

## Features

### Feature: Flow Definition

- BFlow Definition act as a repository of flow. It holds the workspace, agent pool, jobs, steps and resources.
- Any BFlowDefinition can be export and import using the code.

#### Schema

```typescript
interface BFlowDefinition {
  // GUIDv7
  id: string;
  // Unique code for flow and use for export and import key
  code: string;
  // Name of the flow
  name: string;
  // Slug
  slug: string;
  // Description of the flow
  description?: string;
  // Version of the flow
  version?: string;
  // Status of the flow
  status?: "draft" | "published" | "archived";
  // Metadata of the flow
  metadata?: Record<string, unknown>;
  // Created and Updated timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

#### UI

- Create Flow Button: easy access for creating new flow definition
- Flow Management: For CRUD and manage flow definition
- use BunnyFeature for generating page and flow feature

##### UI Flow Definition Page

Similar to github repositories

Tabs

- Dashboard Tab
- Workspaces Tab
- Source Management Tab
- Pipelines Tab
- Agent Pools Tab
- Runs Tab
- Report Tab
- Settings

Children Page

- Dashboard Page
- Workspaces Page
- Source Management Page
- Pipelines Page
- Agent Pools Page
- Runs Page
- Report Page
- Settings Page

#### UseCase

- user as starting point requires to create flow definition that can be used to handle overall management for specific repository.
- it will redirect to flow management page where it can manage workspace, group variables and other flow settings.

### Feature: Workflow

- workflow you create a structured ai jobs and steps and manage it in one place. It manage as a workspace.

#### Schema

Workflow Entity

```typescript
interface BFlowWorkflowTemplate {
  // GUIDv7
  id: string;
  // GUIDv7 reference to BFlowDefinition
  definitionId: string;
  // Name of the workflow
  name: string;
  // Slug
  slug: string;
  // Description of the workflow
  description?: string;
  // Version of the workflow
  version?: string;
  // Status of the workflow
  status?: "draft" | "published" | "archived";
  // Metadata of the workflow
  metadata?: Record<string, unknown>;

  // Template - yaml that contains the setup of the workflow
  TemplateYaml: string | undefined;
  // Actual workflow data
  Template: BFlowWorkflow;
  // Created and Updated timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

Workflow Yaml Records Structure

```typescript
interface BFlowWorkflow {
  name?: string;
  description?: string;
  // sematic version of workflow e.g. 1.0.0
  semanticVersion: string;
  // Variables that will use in workflow
  variables: BFlowVariable[];
  // You can set your group of agent that will inject from flow via agent pool slug
  agentPools: string[];
  // You can setup your agents inside workflow
  agents: BFlowWorkflowAgent[];
  // Jobs - Steps that will execute
  jobs: BFlowWorkflowJob[];
}

interface BFlowVariable {
  id: string; // guid
  name: string;
  defaultValue: string;
  type: "text" | "number" | "boolean" | "select" | "textarea";
  description?: string;
}

interface BFlowWorkflowAgent {
  id: string; // guid
  name: string;
  slug: string;
  role: string;
  prompt: string;
}

interface BFlowWorkJob {
  // guid
  id: string;
  // Jobs avoid spaces
  name: string;
  // agent slug
  agent?: string;
  // Reference to another job slug
  needs?: string | string[];
  // variables - if there is specific variable for this job
  variables?: BFlowVariable[];
  // Prompt
  prompt: string;
  steps: BFlowStep;
}

interface BFlowStep {
  id: string; // guid
  // name of step
  name: string;
  skipIf: BFlowStepSkipIf[];
  inputs: BFlowStepInput[];
  // agent name
  // agentpool.{name}.{agent_name}
  // agent.{name}
  prompts: string | string[];
  agent?: string;
  // Define output format
  // If not define with default output without commentary and extra explanation.
  output?: BFlowOutputMode[];
}

interface BFlowStepSkipIf {
  inputs: string;
  // condition if value meet certain value it will skip the step
  // possible condition: "==", "!=", ">", "<", ">=", "<="
  condition: string;
  value: string | number | boolean;
}

interface BFlowStepInput {
  id: string;
  name: string;
  /**
   * inputs:
   *   - name: slug
   *     source: {job}.{step}.outputs.{name}
   *   - name: slug-1
   *     source: vars.{name}
   */
  source: string;
}

interface BFlowStepOutput {
  // guid
  id: string;
  // name of output
  name: string;
  // source of output
  mode: string;
}

interface BFlowStepOutputMode {
  name: string;
  type: BFlowStepOutputType;
}

type BFlowStepOutputType =
  | "plain"
  | "markdown"
  | "json"
  | "html"
  | "csv"
  | "json_array"
  | "yaml";
```

#### Usecase

- User can create workflow template that can be used to generate workflow.

- Create template first then they will go to workflow editor. Where has automatic saves editor.

- It has two way to build workflow

1. via UI which has interactive input text and select (Future Scope for easy mode)(Prioritize the yaml format)
2. via Yaml - it will display monaco editor with interval time saving. but before the final save or before it run to pipeline the yaml will be validate via zod schema and make sure the variable selector and agent selector reference are valid. If not found it will not run or refuse to run show issue or error message.

#### UI

The yaml editor priorize more than the UI

- Yaml - editor - auto save after 3 seconds if not typing, and uses monaco code editor with yaml formatting. If avaiable use code-formatter for yaml and auto validation showing that format is invalid with yellow line.

- UI - it direct changes of workspace object. it manage deep and nested form modal or page jump e.g. /workspace/{id}/job/{id}. It will display form for job and inside it with table row with row action then display other modal or pages jump for nested property. It has helper selector for selecting agents and variables and sources for convenient. (For future Scoping)

### Feature: Pipeline

- You can run your workflow and feed with Source Variables from Source Management and existing variables.

- Then in pipeline you can add additional variables or override the variables.

- You may add versioning for your pipeline so you can track changes. If Report still use the same template or snapshot it can still access the old template or snapshot.

#### Schema

```typescript
interface BFlowPipeline {
  // GUIDv7
  id: string;
  version: number;
  // GUIDv7 reference to BFlowWorkflowTemplate
  templateId: string;
  // definition id
  flowId: string;
  // variable reference to variable management group
  variableGroupId: string;
  // variables for the job in pipeline. overrides the group variable
  variables: BFlowVariable[];
  // Optional prompt that will override the template prompt
  prompt?: string;
  // Name of the pipeline
  name: string;
  // Slug
  slug: string;
  // Description of the pipeline
  description?: string;
  // Version of the pipeline
  version?: number;
  // Status of the pipeline
  status?: "running" | "completed" | "failed" | "cancelled";
  // Metadata of the pipeline
  metadata?: Record<string, unknown>;
  // Created and Updated timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Temporary and Computed Value for pipeline execution variable
// These variables will not be saved to the database and will be discarded after the pipeline is completed
interface BFlowPipelineVariables {
  // These variables are reference from the computed before pipeline execution and workflow variable default value.
  persistent: BFlowPipelineVariable[];
  // These variables are change and computed property for job
  job: BFlowPipelineVariable[];
  // These variables are computed from the step execution. it gets the value for job
  step: BFlowPipelineVariable[];
}

// The purpose of this is when the pipeline is running each step output will be stored here. so it could be reference from other steps via input source. It will be reference of output.
interface BFlowPipelineStore {
  id: string;
  // reference to BFlowPipeline
  pipelineId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface BFlowPipelineStoreData {
  id: string;
  // reference to BFlowPipelineStore
  storeId: string;
  key: string;
  value: any;
}
```

### Feature: Report Management

Report Generation and Snapshot

```typescript
interface BFlowReportTemplate {
  id: string;
  // guid reference to BFlowWorkflowTemplate
  workflowId: string;
  // guid reference to BFlowDefinition
  flowId: string;
  // Filename of the report
  filename: string;
  //
  reports: BFlowReport[];
}

interface BFlowReport {
  id: string;
  /**
   * This will convert the value to specific.
   * Markdown is the output and convert it to html
   */
  mode: "default" | "plain" | "html" | "markdown";
  /**
   * Add Title On Flow Report
   */
  title?: string;
}

/**
 * Use to accumulate result of report then make it downloadable as single file html or json or md
 */
interface BFlowPipelineReport {
  // guid
  id: string;
  // reference to BFlowPipeline
  pipelineId: string;
  // guid reference to BFlowReportTemplate
  templateId: string;
  // guid reference to BFlowDefinition
  flowId: string;
  // guid reference to BFlowVariableGroup
  variableGroupId: string;
  // guid reference to BFlowPipelineStore
  storeId: string;
  // type of the report
  type: "html" | "json" | "md";
  // Created and Updated timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Use incase template change or update after pipeline is created. you can still download or view previous pipeline report.
 */
interface BFlowReportSnapshot {
  id: string;
  pipelineId: string;
  version: number;
  variables: BFlowPipelineVariables;
  // reference to BFlowReportTemplate objects
  snapshot: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
```

### Feature: Variable Management

- Variable Management is where you can manage your variable

#### Schema

```typescript
interface BFlowVariableGroup {
  // GUIDv7
  id: string;
  // GUIDv7 reference to BFlowDefinition
  flowId: string;
  // Name of the group
  name: string;
  // Slug
  slug: string;
  // Description of the group
  description?: string;
  // Metadata of the group
  metadata?: Record<string, unknown>;
  // Created and Updated timestamps
  createdAt: Date;
  updatedAt: Date;
}

interface BFlowVariable {
  id: string; // guid
  // guid of group
  groupId: string;
  name: string;
  value: string;
  type: "text" | "number" | "boolean" | "select" | "textarea";
  description?: string;
}
```

## Rules

### Rule: File Naming Convention

- Use PascalCase for filenames and directory names.
- Example: `BFlowDefinition.ts`, `BFlowDefinition.Type.ts`
- Use Branding to Every exportable variable or function or types and file name. e.g. BFlow{Name}

### Rule: Feature Entity Schema

- Entity should write via zod schema, this helps on runtime validation
- Use inferred type from z for interface

### Rule: BunnyConfig

- Use BunnyFeature.create instead of `const config: BunnyConfig = {...}`
