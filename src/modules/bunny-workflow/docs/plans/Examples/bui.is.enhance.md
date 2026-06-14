# Bunny AI Workflow Standalone Guide

## 1) Purpose

This guide defines a production-ready workflow specification for Bunny AI, plus implementation rules for parsing, validation, execution, observability, and testing.

Use this as the single reference for:

1.  Authoring YAML workflows
2.  Mapping YAML to TypeScript entities
3.  Running workflows safely in production
4.  Preventing regressions and runtime failures

## 2) Quick Start

1.  Author a YAML workflow using the canonical schema in Section 4.
2.  Parse YAML into `BUIWorkflowConfig`.
3.  Normalize shape (prompts array, reports key casing).
4.  Validate references and dependency graph.
5.  Execute jobs in topological order.
6.  Emit outputs into pipeline store.
7.  Export `reports` document.

## 3) Design Goals

1.  Deterministic: same input should produce reproducible structure.
2.  Safe: clear retry/fallback/timeout behaviors.
3.  Inspectable: step-level run records and costs.
4.  Extensible: easy to add providers, approval gates, and tool steps.
5.  Backward-compatible: supports `Reports` and `reports` during migration.

## 3.1) System Diagram

```javascript
flowchart TD
  A1["Workflow YAML and Agent Config"] --> A2["Normalizer"]
  A2 --> A3["Validator"]
  A3 --> A4["DAG Scheduler"]

  subgraph S1 ["Execution Layer"]
    B1["Resolve Inputs"] --> B2["Apply Step Strategy"]
    B2 --> B3["Execute Agent Step"]
    B3 --> B4["Apply Retry or FallbacPanhhjvccbbk"]
    B4 --> B5["Write Outputs Store"]
  end

  A4 --> B1

  subgraph S2 ["Persistence Layer"]
    C1["Hot Output Store"]
    C2["Immutable Run Archive"]
    C3["Alias Map for Renamed Keys"]
  end

  B5 --> C1
  C1 --> C2
  C3 -.-> C2

  subgraph S3 ["Reporting Layer"]
    D1["Resolve Exports"] --> D2["Render Markdown JSON HTML"]
    D2 --> D3["Publish Report Files"]
  end

  C2 --> D1

  subgraph S4 ["Operations Layer"]
    E1["Run Ledger Metrics"]
    E2["Policy Approval Budget"]
    E3["Extraction API by RunId"]
  end

  B3 --> E1
  B4 --> E2
  C2 --> E3
```

## 4) Canonical YAML Schema (V2)

```javascript
name: Content Generation Pipeline
version: 2
requestId: campaign-2026-06-13
runPolicy: fail_fast # continue | fail_fast
group: staging

variables:
  - name: target_audience
    value: tech startups and early adopters
    description: primary audience
    type: text # text | editor | textarea | select | number

agentPool: marketing-cluster
agents:
  - copywriter-agent
  - seo-agent
  - reviewer-agent

jobs:
  - id: generate_draft
    name: generate_draft
    agent: copywriter-agent
    group: staging
    variables:
      - name: tone_of_voice
        value: professional yet engaging
        type: text
    steps:
      - name: create_article
        prompts:
          - Write a short blog post for {{vars.target_audience}}.
        generate_mode: text # text | flat
        timeoutMs: 45000
        retry:
          maxAttempts: 2
          backoffMs: 500
          jitter: true
        output:
          - name: raw_draft
            description: unoptimized draft
            mode: plain_text

  - id: optimize_seo
    name: optimize_seo
    needs: [generate_draft]
    agent: seo-agent
    steps:
      - name: apply_keywords
        inputs:
          - name: baseline_text
            source: generate_draft.create_article.outputs.raw_draft
        prompts:
          - Inject SEO keywords naturally:\n\n{{inputs.baseline_text}}
        generate_mode: text
        onError: fallback # fail | continue | fallback
        fallback:
          usePreviousOutput: generate_draft.create_article.outputs.raw_draft
        output:
          - name: optimized_draft
            mode: markdown_bullets
            bulletStyle: unordered

reports:
  type: per_job # plain | flat | per_job
  filename: marketing_campaign_report.md
  exports:
    - name: Initial Draft
      value: generate_draft.create_article.outputs.raw_draft
    - name: SEO Draft
      value: optimize_seo.apply_keywords.outputs.optimized_draft

groups:
  - group: production
    variables:
      - name: target_audience
        value: enterprise executives
        type: text
```

## 5) TypeScript Entities

```javascript
export type BUIWorkflowVariableType =
  | "text"
  | "editor"
  | "textarea"
  | "select"
  | "number";

export type BUIWorkflowGenerateMode = "text" | "flat";
export type BUIWorkflowReportType = "plain" | "flat" | "per_job";
export type BUIRunPolicy = "continue" | "fail_fast";
export type BUIErrorPolicy = "fail" | "continue" | "fallback";
export type BUIWorkflowOutputMode =
  | "plain_text"
  | "markdown_heading"
  | "markdown_bullets"
  | "markdown_table"
  | "markdown_quote"
  | "html_fragment"
  | "json_object"
  | "json_array"
  | "yaml_block"
  | "csv_row";

export interface BUIWorkflowVariable {
  name: string;
  value: string | number | boolean;
  description?: string;
  type: BUIWorkflowVariableType;
}

export interface BUIRetryPolicy {
  maxAttempts: number;
  backoffMs?: number;
  jitter?: boolean;
}

export interface BUIBudgetPolicy {
  maxInputTokens?: number;
  maxOutputTokens?: number;
  maxUsdCost?: number;
}

export interface BUICondition {
  expression: string;
}

export interface BUIFallback {
  prompt?: string;
  usePreviousOutput?: string;
}

export interface BUIApprovalGate {
  required: boolean;
  reviewers?: string[];
  reason?: string;
}

export interface BUIWorkflowStepInput {
  name: string;
  source: string;
}

export interface BUIWorkflowOutputDescriptor {
  name: string;
  description?: string;
  mode?: BUIWorkflowOutputMode;

  // Optional render hints
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  bulletStyle?: "unordered" | "ordered" | "task";
  htmlTag?: "section" | "article" | "p" | "ul" | "ol" | "table" | "div";
  contentType?: "text/plain" | "text/markdown" | "text/html" | "application/json";
}

export type BUIWorkflowStepOutput =
  | "plain"
  | BUIWorkflowOutputDescriptor[];

export interface BUIWorkflowStep {
  name: string;
  inputs?: BUIWorkflowStepInput[];
  prompts: string | string[];
  generate_mode?: BUIWorkflowGenerateMode;
  output?: BUIWorkflowStepOutput;

  condition?: BUICondition;
  retry?: BUIRetryPolicy;
  timeoutMs?: number;
  onError?: BUIErrorPolicy;
  fallback?: BUIFallback;
  budget?: BUIBudgetPolicy;
  approval?: BUIApprovalGate;
  tags?: string[];
}

export interface BUIWorkflowJob {
  id?: string;
  name: string;
  needs?: string | string[];
  agent: string;
  group?: string;
  variables?: BUIWorkflowVariable[];
  steps: BUIWorkflowStep[];
}

export interface BUIWorkflowGroupOverride {
  group: string;
  variables?: BUIWorkflowVariable[];
}

export interface BUIWorkflowReportExport {
  name: string;
  value: string;
}

export interface BUIWorkflowReports {
  type: BUIWorkflowReportType;
  filename: string;
  exports: BUIWorkflowReportExport[];
}

export interface BUIWorkflowConfig {
  name: string;
  version?: number;
  requestId?: string;
  runPolicy?: BUIRunPolicy;
  group?: string;
  variables?: BUIWorkflowVariable[];
  agentPool?: string;
  agents?: string[];
  jobs: BUIWorkflowJob[];
  groups?: BUIWorkflowGroupOverride[];

  // Backward compatibility during migration.
  Reports?: BUIWorkflowReports;
  reports?: BUIWorkflowReports;
}
```

## 5.1) Complete Entity Documentation

This section documents every entity and field used by the workflow schema.

### A) Enum and Union Types

#### `BUIWorkflowVariableType`

Allowed values:

1.  `text`: single-line plain text input
2.  `editor`: rich text / long-form editor content
3.  `textarea`: multiline plain text
4.  `select`: constrained value from predefined options
5.  `number`: numeric value (used for temperature, limits, thresholds)

#### `BUIWorkflowGenerateMode`

Allowed values:

1.  `text`: expected freeform text output
2.  `flat`: compact/plain output, usually mapped to `outputs.default`

#### `BUIWorkflowReportType`

Allowed values:

1.  `plain`: one flat report payload
2.  `flat`: flattened report layout
3.  `per_job`: grouped report sections by job

#### `BUIRunPolicy`

Allowed values:

1.  `continue`: continue eligible jobs even after failures
2.  `fail_fast`: terminate workflow on critical failure

#### `BUIErrorPolicy`

Allowed values:

1.  `fail`: stop step/job based on run policy
2.  `continue`: mark step failed and move on
3.  `fallback`: use fallback logic then continue

#### `BUIWorkflowOutputMode`

Allowed values:

1.  `plain_text`: plain text output
2.  `markdown_heading`: markdown heading output
3.  `markdown_bullets`: markdown bullet list output
4.  `markdown_table`: markdown table output
5.  `markdown_quote`: markdown block quote output
6.  `html_fragment`: html snippet output
7.  `json_object`: json object output
8.  `json_array`: json array output
9.  `yaml_block`: yaml block output
10.  `csv_row`: csv row output

### B) Core Value Objects

#### `BUIWorkflowVariable`

Fields:

1.  `name` (required): variable key used in interpolation, for example `{{vars.name}}`
2.  `value` (required): `string | number | boolean`
3.  `description` (optional): human-readable note for editors/UI
4.  `type` (required): one of `BUIWorkflowVariableType`

Rules:

1.  `name` should be unique within the same variable scope.
2.  Job-level variable with same `name` overrides workflow-level variable.
3.  Group override variables apply after workflow defaults.

#### `BUIRetryPolicy`

Fields:

1.  `maxAttempts` (required): total attempts including first run
2.  `backoffMs` (optional): base delay between attempts
3.  `jitter` (optional): randomize delay to prevent synchronized retries

Rules:

1.  `maxAttempts >= 1`.
2.  Recommended upper bound: `maxAttempts <= 5`.
3.  If omitted, engine default should be used.

#### `BUIBudgetPolicy`

Fields:

1.  `maxInputTokens` (optional): cap for prompt/input tokens
2.  `maxOutputTokens` (optional): cap for completion tokens
3.  `maxUsdCost` (optional): cap for step cost in USD

Rules:

1.  Any defined value must be positive.
2.  Runtime should hard-fail or short-circuit when budget is exceeded.

#### `BUICondition`

Fields:

1.  `expression` (required): condition expression evaluated before step execution

Rules:

1.  False condition results in `skipped` step status.
2.  Expression evaluator should be sandboxed (no dynamic code execution).

#### `BUIFallback`

Fields:

1.  `prompt` (optional): alternate prompt used when primary execution fails
2.  `usePreviousOutput` (optional): reference path to reuse previous output

Rules:

1.  Required when `onError = fallback`.
2.  At least one of `prompt` or `usePreviousOutput` should exist.

#### `BUIApprovalGate`

Fields:

1.  `required` (required): whether approval is mandatory
2.  `reviewers` (optional): logical reviewer ids/groups
3.  `reason` (optional): why approval is needed

Rules:

1.  If `required=true`, execution must pause until approved/rejected.
2.  Rejection should mark step as failed or blocked.

#### `BUIWorkflowStepInput`

Fields:

1.  `name` (required): input alias used by prompt template
2.  `source` (required): fully qualified pipeline path

Rules:

1.  `source` must resolve to an upstream output.
2.  Disallow unresolved references at preflight stage.

### C) Step Entity

#### `BUIWorkflowStep`

Fields:

1.  `name` (required): unique step identifier inside a job
2.  `inputs` (optional): list of `BUIWorkflowStepInput`
3.  `prompts` (required): string or string array
4.  `generate_mode` (optional): defaults to `text`
5.  `output` (optional): `plain` or named output descriptors with mode/render hints
6.  `condition` (optional): execution guard
7.  `retry` (optional): retry policy
8.  `timeoutMs` (optional): per-step timeout in milliseconds
9.  `onError` (optional): defaults to `fail`
10.  `fallback` (optional): fallback directive
11.  `budget` (optional): token/cost limits
12.  `approval` (optional): human approval gate
13.  `tags` (optional): metadata labels

Rules:

1.  Normalize `prompts` to array.
2.  If `output = plain`, runtime must write to `outputs.default`.
3.  If `onError=fallback`, enforce `fallback` validation.
4.  `timeoutMs` should be within platform limits.
5.  If output descriptor `mode` is omitted, default to `plain_text`.
6.  For `markdown_heading`, use `headingLevel` (default recommended: `2`).
7.  For `markdown_bullets`, use `bulletStyle` (default recommended: `unordered`).
8.  For `html_fragment`, sanitize before rendering in UI.

### D) Job Entity

#### `BUIWorkflowJob`

Fields:

1.  `id` (optional): stable machine id; recommended for long-term references
2.  `name` (required): human-readable and referenceable job name
3.  `needs` (optional): dependency job name(s)
4.  `agent` (required): selected agent id
5.  `group` (optional): env/group override for this job
6.  `variables` (optional): job-local variable overrides
7.  `steps` (required): ordered step list

Rules:

1.  `name` must be unique across workflow jobs.
2.  `needs` dependencies must exist.
3.  Graph must be acyclic.
4.  Step names must be unique within the job.

### E) Group Override Entity

#### `BUIWorkflowGroupOverride`

Fields:

1.  `group` (required): target group/environment name
2.  `variables` (optional): variable overrides for this group

Rules:

1.  Group names should be unique.
2.  Active workflow group pulls matching override by name.

### F) Reporting Entities

#### `BUIWorkflowReportExport`

Fields:

1.  `name` (required): report section title
2.  `value` (required): source reference path

Rules:

1.  `value` must resolve at report build time.

#### `BUIWorkflowReports`

Fields:

1.  `type` (required): one of `plain | flat | per_job`
2.  `filename` (required): output artifact filename
3.  `exports` (required): list of export mappings

Rules:

1.  `filename` should include extension (`.md`, `.txt`, `.json`).
2.  Export names should be unique for predictable rendering.

### G) Root Workflow Entity

#### `BUIWorkflowConfig`

Fields:

1.  `name` (required): workflow display name
2.  `version` (optional): recommended default `2`
3.  `requestId` (optional): idempotency and tracking key
4.  `runPolicy` (optional): default `fail_fast`
5.  `group` (optional): active environment group
6.  `variables` (optional): workflow-level defaults
7.  `agentPool` (optional): logical pool name
8.  `agents` (optional): allowed or declared agent ids
9.  `jobs` (required): workflow execution units
10.  `groups` (optional): group-level variable overrides
11.  `Reports` (optional): legacy key
12.  `reports` (optional): canonical key

Rules:

1.  Exactly one effective reports object after normalization.
2.  `jobs` must contain at least one job.
3.  All references must resolve against pipeline store contract.
4.  `Reports` should be normalized to `reports` and deprecated over time.

### H) Defaults Summary

Recommended defaults:

1.  `version = 2`
2.  `runPolicy = fail_fast`
3.  `step.generate_mode = text`
4.  `step.onError = fail`
5.  `step.retry.maxAttempts = 1` when retry object is omitted

### I) Naming and Path Conventions

1.  Use snake\_case or kebab-case consistently for job and step names.
2.  Keep `source` paths in the form `<job>.<step>.outputs.<name>`.
3.  Reserve `default` for `output: plain`.
4.  Avoid dynamic output keys that make validation impossible.

## 6) Normalization Rules

Apply these before validation:

1.  Convert `Reports` to `reports`.
2.  Convert `prompts` string to string array.
3.  Convert `needs` string to array.
4.  Set defaults:
    1.  `version = 2`
    2.  `runPolicy = "fail_fast"`
    3.  `step.generate_mode = "text"`
    4.  `step.onError = "fail"`
5.  Normalize output descriptors:
6.  `output=plain` maps to `outputs.default` mode `plain_text`
7.  output descriptor `mode` defaults to `plain_text`
8.  `markdown_heading.headingLevel` defaults to `2`
9.  `markdown_bullets.bulletStyle` defaults to `unordered`

```javascript
export type BUIWorkflowNormalized = Omit<BUIWorkflowConfig, "Reports" | "jobs"> & {
  reports?: BUIWorkflowReports;
  jobs: Array<Omit<BUIWorkflowJob, "needs" | "steps"> & {
    needs: string[];
    steps: Array<Omit<BUIWorkflowStep, "prompts"> & { prompts: string[] }>;
  }>;
};

export function normalizeWorkflow(config: BUIWorkflowConfig): BUIWorkflowNormalized {
  return {
    ...config,
    version: config.version ?? 2,
    runPolicy: config.runPolicy ?? "fail_fast",
    reports: config.Reports ?? config.reports,
    jobs: config.jobs.map((job) => ({
      ...job,
      needs: Array.isArray(job.needs)
        ? job.needs
        : job.needs
          ? [job.needs]
          : [],
      steps: job.steps.map((step) => {
        const normalizedOutput =
          step.output === "plain"
            ? "plain"
            : step.output?.map((o) => ({
                ...o,
                mode: o.mode ?? "plain_text",
                headingLevel:
                  (o.mode ?? "plain_text") === "markdown_heading"
                    ? (o.headingLevel ?? 2)
                    : o.headingLevel,
                bulletStyle:
                  (o.mode ?? "plain_text") === "markdown_bullets"
                    ? (o.bulletStyle ?? "unordered")
                    : o.bulletStyle,
              }));

        return {
          ...step,
          generate_mode: step.generate_mode ?? "text",
          onError: step.onError ?? "fail",
          prompts: Array.isArray(step.prompts) ? step.prompts : [step.prompts],
          output: normalizedOutput,
        };
      }),
    })),
  };
}
```

## 7) Validation Checklist

Run in this order:

1.  Structural validation
    1.  Required fields present
    2.  Enum values valid
2.  Identity validation
    1.  Unique job names/ids
    2.  Unique step names per job
3.  Graph validation
    1.  All `needs` exist
    2.  No cycles in dependency graph
4.  Reference validation
    1.  Every `inputs[].source` resolves
    2.  Every `reports.exports[].value` resolves
5.  Policy validation
    1.  `retry.maxAttempts >= 1`
    2.  Reasonable `timeoutMs` bounds
    3.  `onError=fallback` requires `fallback`

## 8) Execution Semantics

Execution order:

1.  Build DAG from jobs + `needs`.
2.  Topologically order runnable jobs.
3.  For each step:
    1.  Evaluate condition (if present)
    2.  Resolve inputs
    3.  Render prompts with template variables
    4.  Execute model/tool call with timeout and retry
    5.  Apply `onError` policy
    6.  Persist outputs to pipeline store
4.  Build report exports.
5.  Emit final run status.

Error policy behavior:

1.  `fail`: stop current job (and whole workflow if `runPolicy=fail_fast`).
2.  `continue`: mark step failed and continue with next step.
3.  `fallback`: use fallback prompt or fallback source, then continue.

## 9) Pipeline Store Contract

Store keys in this normalized shape:

```javascript
<jobName>.<stepName>.outputs.<outputName>
```

Reserved output name:

1.  `default` is used when `output: plain`.

Example keys:

1.  `generate_draft.create_article.outputs.raw_draft`
2.  `optimize_seo.generate_meta_summary.outputs.default`

## 9.1) Output Storage Entities (Complete)

Use these entities to persist generated values, track provenance, and safely resolve references.

```javascript
export type BUIWorkflowOutputStatus =
  | "created"
  | "updated"
  | "fallback"
  | "skipped"
  | "failed";

export interface BUIWorkflowOutputRef {
  job: string;
  step: string;
  output: string; // output name or "default"
}

export interface BUIWorkflowStoredValue {
  // Canonical key: <job>.<step>.outputs.<output>
  key: string;

  ref: BUIWorkflowOutputRef;
  value: string;
  mode?: BUIWorkflowOutputMode;
  contentType?: string;

  // Metadata
  status: BUIWorkflowOutputStatus;
  runId: string;
  createdAt: string;
  updatedAt?: string;
  attempt?: number;

  // Optional provenance for audits/debugging
  sourcePrompt?: string;
  sourceInputs?: Record<string, string>;
  model?: string;
  provider?: string;

  // Optional token/cost accounting
  inputTokens?: number;
  outputTokens?: number;
  usdCost?: number;
}

export interface BUIWorkflowStepOutputRecord {
  runId: string;
  job: string;
  step: string;

  // Named outputs from a single step execution
  outputs: Record<string, BUIWorkflowStoredValue>;

  // Timing and status
  status: "success" | "failed" | "skipped" | "partial";
  startedAt: string;
  endedAt?: string;
}

export interface BUIWorkflowOutputStore {
  // Keyed by canonical pipeline key
  values: Record<string, BUIWorkflowStoredValue>;

  // Optional grouped index for fast lookup per step
  byStep?: Record<string, BUIWorkflowStepOutputRecord>;
}

export interface BUIWorkflowResolvedInput {
  name: string;
  source: string;
  resolvedKey: string;
  value: string;
}

export interface BUIWorkflowReportMaterializedExport {
  name: string;
  source: string;
  resolvedKey: string;
  value: string;
  missing?: boolean;
}

export interface BUIWorkflowMaterializedReport {
  runId: string;
  filename: string;
  type: "plain" | "flat" | "per_job";
  exports: BUIWorkflowReportMaterializedExport[];
  generatedAt: string;
}
```

### Output Entity Rules

1.  `BUIWorkflowStoredValue.key` must always equal `<job>.<step>.outputs.<output>`.
2.  `ref.output` must be `default` when step output mode is `plain`.
3.  Store only normalized text in `value`; serialize non-text payloads before storing.
4.  `status=fallback` must indicate value came from fallback path.
5.  `attempt` should reflect the final successful attempt number when retries are used.
6.  `BUIWorkflowResolvedInput` must be generated before prompt rendering.
7.  Materialized reports should keep both `source` and `resolvedKey` for traceability.
8.  Persist output `mode` and `contentType` so render behavior remains stable across workflow updates.

### Output Lifecycle

1.  Step starts -> initialize `BUIWorkflowStepOutputRecord`.
2.  Resolve sources -> emit `BUIWorkflowResolvedInput[]`.
3.  Model/tool returns -> write `BUIWorkflowStoredValue` per output.
4.  Step ends -> finalize `BUIWorkflowStepOutputRecord.status`.
5.  Report stage -> build `BUIWorkflowMaterializedReport` from store values.

### Minimal Resolver Contract

```javascript
export interface BUIWorkflowOutputResolver {
  get(key: string): BUIWorkflowStoredValue | undefined;
  set(entry: BUIWorkflowStoredValue): void;
  has(key: string): boolean;
  resolve(source: string): BUIWorkflowStoredValue;
}
```

Resolver behavior:

1.  `resolve(source)` throws preflight/runtime error when key is missing.
2.  Keys are case-sensitive and must match canonical naming.
3.  Resolver must not silently coerce invalid keys.

## 9.2) Workflow Update Safety and Record Extraction

When a workflow is edited (renamed jobs/steps/outputs, removed nodes, changed paths), old keys may no longer resolve in the current runtime.

To keep historical data accessible, treat run outputs as immutable snapshots bound to the workflow definition used at execution time.

### Additional Entities for Historical Access

```javascript
export interface BUIWorkflowDefinitionRef {
  workflowName: string;
  workflowVersion: number;
  definitionHash: string; // hash of normalized workflow definition
}

export interface BUIWorkflowOutputAlias {
  oldKey: string;
  newKey: string;
  reason?: string; // renamed job/step/output
}

export interface BUIWorkflowOutputArchiveRecord {
  runId: string;
  definition: BUIWorkflowDefinitionRef;

  // Immutable snapshot of values written during the run
  values: Record<string, BUIWorkflowStoredValue>;

  // Optional migration map from old keys to new keys
  aliases?: BUIWorkflowOutputAlias[];

  createdAt: string;
}

export interface BUIWorkflowExtractRequest {
  runId: string;
  key?: string; // exact canonical key
  source?: string; // job.step.outputs.output style reference
  includeAliases?: boolean;
}

export interface BUIWorkflowExtractResult {
  runId: string;
  requested: string;
  resolvedKey?: string;
  value?: string;
  found: boolean;
  fromAlias?: boolean;
  archivedDefinition?: BUIWorkflowDefinitionRef;
}
```

### Required Runtime Behavior

1.  On each run start, persist `BUIWorkflowDefinitionRef`.
2.  On run end, persist immutable `BUIWorkflowOutputArchiveRecord`.
3.  Never mutate archived values during future workflow updates.
4.  If workflow refactoring renames keys, append `aliases` instead of rewriting historical records.
5.  Extraction must first query archive by `runId`, then try direct key, then aliases.

### Recommended Extraction Contract

```javascript
export interface BUIWorkflowArchiveService {
  save(record: BUIWorkflowOutputArchiveRecord): Promise<void>;
  getRun(runId: string): Promise<BUIWorkflowOutputArchiveRecord | undefined>;
  extract(request: BUIWorkflowExtractRequest): Promise<BUIWorkflowExtractResult>;
}
```

### Practical Notes

1.  Keep archive storage separate from hot runtime store for reliability.
2.  Add retention policy by age and project, but never delete regulated/audited runs.
3.  Include export endpoint to download run archive as JSON for offline analysis.
4.  In UI, show a warning when a value was resolved through alias mapping.

### Example: Key Rename Without Data Loss

If workflow V2 renames:

1.  `optimize_seo.apply_keywords.outputs.optimized_draft`

to:

1.  `seo_refine.apply_keywords.outputs.optimized_copy`

Then keep old archived value under old key and add alias:

```javascript
const alias: BUIWorkflowOutputAlias = {
  oldKey: "optimize_seo.apply_keywords.outputs.optimized_draft",
  newKey: "seo_refine.apply_keywords.outputs.optimized_copy",
  reason: "job rename optimize_seo -> seo_refine",
};
```

This ensures you can still extract record values from historical runs even when current workflow keys changed.

## 10) Run Ledger (Observability)

Recommended run record:

```javascript
export interface BUIRunStepLedger {
  job: string;
  step: string;
  status: "queued" | "running" | "success" | "failed" | "skipped";
  startedAt?: string;
  endedAt?: string;
  attempts: number;
  inputTokens?: number;
  outputTokens?: number;
  usdCost?: number;
  error?: string;
}

export interface BUIRunLedger {
  runId: string;
  workflow: string;
  requestId?: string;
  status: "success" | "failed" | "partial";
  startedAt: string;
  endedAt?: string;
  steps: BUIRunStepLedger[];
}
```

## 11) Security and Reliability

1.  Never store secrets in workflow YAML.
2.  Resolve provider credentials from environment/secret manager.
3.  Redact secrets in logs and reports.
4.  Set global max timeout and cost ceiling.
5.  Add idempotency key using `requestId + runId`.
6.  Persist checkpoints for resumable reruns.

## 12) Recommended Workflow Cases

1.  Content generation with editorial approval gate.
2.  Multi-audience branching (`startup`, `enterprise`, `developer`).
3.  Prompt A/B testing and auto-selection.
4.  Localization (`en`, `es`, `jp`) with locale-specific variables.
5.  Fact-check pipeline with citation requirement.
6.  Compliance/legal review before publish.
7.  Incident-safe fallback mode when critical jobs fail.
8.  Cost-optimized mode for high-volume campaigns.

## 13) Edge Cases to Handle Explicitly

1.  Missing `inputs.source` path.
2.  Circular `needs` graph.
3.  Duplicate job/step names.
4.  Undefined interpolation variable.
5.  Empty model response.
6.  Output key collisions.
7.  Invalid enum values.
8.  Missing environment group override.
9.  Mixed `Reports` and `reports` keys.
10.  Partial run recovery from checkpoint.

## 14) Testing Matrix

1.  Happy path end-to-end.
2.  Timeout then retry success.
3.  Retry exhausted then fallback success.
4.  `onError=continue` produces partial run.
5.  Broken reference path fails validation.
6.  Circular dependency fails preflight.
7.  Report export missing source fails preflight.
8.  Approval required but not granted.
9.  Resume from checkpoint after crash.

## 15) Migration Guide (V1 to V2)

1.  Keep reading both `Reports` and `reports`.
2.  Add `version` defaulting to `2`.
3.  Normalize all `prompts` to arrays.
4.  Normalize all `needs` to arrays.
5.  Introduce `runPolicy` and `onError` defaults.
6.  Add validation for references and DAG before execution.

## 16) Implementation Roadmap

Phase 1:

1.  Normalizer
2.  Zod validation schema
3.  DAG checker

Phase 2:

1.  Execution engine with retry/timeout/fallback
2.  Pipeline store + reference resolver
3.  Report exporter

Phase 3:

1.  Run ledger + cost metrics
2.  Approval gate integration
3.  Snapshot/fixture regression tests

## 17) Production Defaults (Suggested)

1.  `runPolicy = fail_fast`
2.  `retry.maxAttempts = 2`
3.  `timeoutMs = 45000`
4.  `onError = fail`
5.  `maxOutputTokens` capped per step
6.  hard max workflow budget per run

## 18) Final Recommendation

For your current pipeline, the most impactful immediate upgrades are:

1.  Preflight validation (graph + references)
2.  Retry/timeout/fallback policies per step
3.  Run ledger with status and costs
4.  Approval gate for publish-sensitive jobs

These four changes give the largest reliability gain with minimal design disruption.

## 19) Improved Report Generation (V2)

This section upgrades report generation from simple export mapping to structured, auditable, multi-format reporting.

### 19.1 Objectives

1.  Produce deterministic reports across reruns.
2.  Support `markdown`, `json`, and `html` output.
3.  Add run summary, per-job sections, and failure diagnostics.
4.  Preserve missing/migrated values with explicit markers.

### 19.2 Report Entities

```javascript
export type BUIReportFormat = "markdown" | "json" | "html";
export type BUIReportMissingPolicy = "error" | "warn" | "skip";

export interface BUIReportSection {
  id: string;
  title: string;
  exports: Array<{
    name: string;
    source: string;
  }>;
  optional?: boolean;
}

export interface BUIReportRenderOptions {
  includeRunSummary?: boolean;
  includeJobStatusTable?: boolean;
  includeTokenAndCost?: boolean;
  includePromptTrace?: boolean;
  includeMissingReferences?: boolean;
}

export interface BUIReportOutputTarget {
  filename: string;
  format: BUIReportFormat;
}

export interface BUIReportConfigV2 {
  type: "plain" | "flat" | "per_job" | "sectioned";
  missingPolicy?: BUIReportMissingPolicy;
  sections?: BUIReportSection[];
  outputs: BUIReportOutputTarget[];
  render?: BUIReportRenderOptions;
}
```

### 19.3 Recommended Report Algorithm

1.  Resolve all references against run archive first, then hot store.
2.  Materialize exports with `resolvedKey`, `found`, and `fromAlias` metadata.
3.  Apply `missingPolicy`:
    1.  `error`: fail report build
    2.  `warn`: include warnings and continue
    3.  `skip`: omit missing items
4.  Add run summary block:
    1.  workflow version/hash
    2.  run status and duration
    3.  succeeded/failed/skipped counts
    4.  token/cost totals
5.  Render each configured format.

### 19.4 Example Report Config

```javascript
reports:
  type: sectioned
  missingPolicy: warn
  outputs:
    - filename: marketing_campaign_report.md
      format: markdown
    - filename: marketing_campaign_report.json
      format: json
  render:
    includeRunSummary: true
    includeJobStatusTable: true
    includeTokenAndCost: true
    includeMissingReferences: true
  sections:
    - id: content
      title: Content Outputs
      exports:
        - name: Initial Draft
          source: generate_draft.create_article.outputs.raw_draft
        - name: SEO Draft
          source: optimize_seo.apply_keywords.outputs.optimized_draft
    - id: meta
      title: Search Metadata
      optional: true
      exports:
        - name: Meta Summary
          source: optimize_seo.generate_meta_summary.outputs.default
```

## 20) Separate Agent Configuration (Pool + Agent + Step Strategy)

This section defines a separate agent configuration model so `agentPool` can be selected at workflow and job levels, while agents can apply strategy to specific steps.

### 20.1 Core Model

1.  Workflow file defines orchestration (`jobs`, `steps`, references).
2.  Agent config file defines execution behavior (`pools`, `agents`, `step strategies`).
3.  Runtime resolves effective agent config using precedence rules.

### 20.2 Agent Config Entities

```javascript
export interface BUIAgentPoolRef {
  id: string;
}

export interface BUIAgentStepMatch {
  job?: string;
  step?: string;
  tag?: string;
}

export interface BUIAgentStepStrategy {
  match: BUIAgentStepMatch;
  model?: string;
  provider?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  retry?: {
    maxAttempts: number;
    backoffMs?: number;
    jitter?: boolean;
  };
  tools?: string[];
  systemPrompt?: string;
}

export interface BUIAgentConfig {
  id: string;
  role?: string;
  defaultProvider?: string;
  defaultModel?: string;
  defaultTemperature?: number;
  capabilities?: string[];
  stepStrategies?: BUIAgentStepStrategy[];
}

export interface BUIAgentPoolConfig {
  id: string;
  description?: string;
  defaultAgent?: string;
  agents: string[];
}

export interface BUIAgentConfigurationDocument {
  version: number;
  pools: BUIAgentPoolConfig[];
  agents: BUIAgentConfig[];
}
```

### 20.3 Workflow Extensions for Agent Selection

```javascript
export interface BUIWorkflowStep {
  // existing fields...
  agent?: string; // optional step-level agent override
}

export interface BUIWorkflowJob {
  // existing fields...
  agentPool?: string; // optional job-level pool override
}

export interface BUIWorkflowConfig {
  // existing fields...
  agentPool?: string; // workflow-level default pool
  agentConfigRef?: string; // e.g. configs/agent.config.yaml
}
```

### 20.4 Resolution Precedence

Resolve effective pool and agent in this order:

1.  Pool precedence:
    1.  `step.agent` implies direct agent selection, pool optional
    2.  `job.agentPool`
    3.  `workflow.agentPool`
2.  Agent precedence:
    1.  `step.agent`
    2.  `job.agent`
    3.  pool `defaultAgent`
3.  Strategy precedence (highest wins):
    1.  matched `agent.stepStrategies` by `job+step`
    2.  matched `agent.stepStrategies` by `tag`
    3.  `agent` defaults
    4.  workflow/job step defaults

### 20.5 Validation Rules

1.  `agentConfigRef` must load a valid `BUIAgentConfigurationDocument`.
2.  Every referenced `agentPool` must exist in config.
3.  Every selected `agent` must exist and be part of resolved pool (unless explicitly global).
4.  `step.agent` override not in pool should fail unless `allowCrossPoolAgent=true` is enabled.
5.  Strategy match collisions should be deterministic (first match or priority field).

### 20.6 Example Separate Agent Config

```javascript
version: 1
pools:
  - id: marketing-cluster
    description: Content and SEO pool
    defaultAgent: copywriter-agent
    agents:
      - copywriter-agent
      - seo-agent
      - reviewer-agent

  - id: legal-cluster
    defaultAgent: reviewer-agent
    agents:
      - reviewer-agent

agents:
  - id: copywriter-agent
    role: drafting
    defaultProvider: openai
    defaultModel: gpt-5.3-codex
    defaultTemperature: 0.7
    capabilities: [drafting, rewriting]
    stepStrategies:
      - match:
          job: generate_draft
          step: create_article
        temperature: 0.8
        maxTokens: 1200

  - id: seo-agent
    role: optimization
    defaultProvider: openai
    defaultModel: gpt-5.3-codex
    defaultTemperature: 0.4
    capabilities: [seo, metadata]
    stepStrategies:
      - match:
          job: optimize_seo
          step: apply_keywords
        temperature: 0.3
        maxTokens: 900
      - match:
          job: optimize_seo
          step: generate_meta_summary
        temperature: 0.2
        maxTokens: 180

  - id: reviewer-agent
    role: compliance
    defaultProvider: openai
    defaultModel: gpt-5.3-codex
    defaultTemperature: 0.1
    capabilities: [compliance, risk-review]
```

### 20.7 Example Workflow Using Separate Agent Config

```javascript
name: Content Generation Pipeline
version: 2
agentConfigRef: configs/agent.config.yaml
agentPool: marketing-cluster

jobs:
  - name: generate_draft
    agent: copywriter-agent
    steps:
      - name: create_article
        prompts:
          - "Write a short blog post for {{vars.target_audience}}"
        output:
          - name: raw_draft

  - name: optimize_seo
    agentPool: marketing-cluster
    agent: seo-agent
    steps:
      - name: apply_keywords
        prompts:
          - "Inject SEO keywords naturally"
        output:
          - name: optimized_draft

  - name: legal_review
    agentPool: legal-cluster
    steps:
      - name: compliance_check
        agent: reviewer-agent
        prompts:
          - "Review for legal/compliance risks"
        output:
          - name: compliance_report
```

### 20.8 Why This Design Works

1.  Keeps workflow orchestration clean and portable.
2.  Separates operational AI tuning from business flow definition.
3.  Enables multi-level pool control (workflow and job).
4.  Gives step-specific handling without hardcoding model behavior in every step.
5.  Supports safer upgrades by editing agent config independently.

## 21) What You Need Beyond Agent, Workflow, and Reports

1.  Runtime scheduler
2.  DAG execution
3.  retry/timeout/fallback handling
4.  concurrency controls
5.  Validation engine
6.  schema validation
7.  dependency validation
8.  reference-resolution validation
9.  Template engine
10.  strict interpolation for `vars`, `inputs`, and `outputs`
11.  explicit missing-key behavior
12.  Output persistence and archive
13.  hot runtime store
14.  immutable run archive
15.  extraction API for historical records
16.  Policy and governance layer
17.  safety guardrails
18.  budget policy
19.  approval gates
20.  compliance checks
21.  Observability stack
22.  run ledger
23.  structured logs
24.  trace and performance metrics
25.  token/cost tracking
26.  Provider and secret manager
27.  provider routing
28.  credential storage and rotation
29.  endpoint policy per environment
30.  Compatibility and migration
31.  schema versioning
32.  output key aliases
33.  backward readers
34.  retention and archival policyy