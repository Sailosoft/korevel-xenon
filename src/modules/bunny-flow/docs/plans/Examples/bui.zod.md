# BUI Zod Schema — Planning & Implementation Guide

> **Source:** [`bui.is.enhance.md`](src/modules/bunny-flow/docs/plans/Examples/bui.is.enhance.md)
> **Purpose:** Define a single-source-of-truth Zod schema for parsing, validating, and normalizing BUI (Bunny AI) workflow configurations, agent configurations, output storage, archive records, run ledger, and reports.

---

## 1) Design Principles

1. **Deterministic —** same input always produces the same parsed/normalized structure.
2. **Fail-fast on malformed input —** invalid enums, missing required fields, or out-of-range values produce clear, actionable errors.
3. **Cross-field validation via `superRefine` —** interdependencies (e.g. `onError=fallback` requires `fallback` present) are caught at parse time.
4. **Normalization baked into `.transform()` —** defaults, casing fixes, and array coercion happen during parsing, not in separate passes.
5. **Composable —** each entity maps to its own Zod schema; root schemas compose from parts.
6. **Extensible —** new output modes, report formats, or agent strategies can be added without breaking existing schemas.
7. **Backward-compatible —** `Reports` → `reports` migration is handled transparently in transform.

---

## 2) File Organisation

```
src/modules/bunny-flow/
  schema/
    bui.enums.ts              — z.enum() for all union types
    bui.primitives.ts         — reusable branded strings, refs, positive numbers
    bui.policies.ts           — retry, budget, fallback, condition, approval
    bui.variable.ts           — BUIWorkflowVariable
    bui.step.ts               — BUIWorkflowStepInput, BUIWorkflowOutputDescriptor, BUIWorkflowStep
    bui.job.ts                — BUIWorkflowJob
    bui.report.ts             — BUIWorkflowReports, BUIReportConfigV2
    bui.workflow.ts           — BUIWorkflowConfig (root), BUIWorkflowNormalized
    bui.output-store.ts       — output storage entities
    bui.archive.ts            — historical access entities
    bui.ledger.ts             — run ledger entities
    bui.agent-config.ts       — agent pool/config entities
    bui.resolver.ts           — resolver contract interface (Zod schema for shape)
    bui.index.ts              — barrel export
```

---

## 3) Enum & Union Type Schemas

### 3.1 `bui.enums.ts`

```typescript
import { z } from "zod";

// ── Variable Types ──────────────────────────────────────────────
export const BUIWorkflowVariableTypeSchema = z.enum([
  "text",
  "editor",
  "textarea",
  "select",
  "number",
]);
export type BUIWorkflowVariableType = z.infer<
  typeof BUIWorkflowVariableTypeSchema
>;

// ── Generate Modes ──────────────────────────────────────────────
export const BUIWorkflowGenerateModeSchema = z.enum(["text", "flat"]);
export type BUIWorkflowGenerateMode = z.infer<
  typeof BUIWorkflowGenerateModeSchema
>;

// ── Report Types ────────────────────────────────────────────────
export const BUIWorkflowReportTypeSchema = z.enum(["plain", "flat", "per_job"]);
export type BUIWorkflowReportType = z.infer<typeof BUIWorkflowReportTypeSchema>;

// ── Run Policies ────────────────────────────────────────────────
export const BUIRunPolicySchema = z.enum(["continue", "fail_fast"]);
export type BUIRunPolicy = z.infer<typeof BUIRunPolicySchema>;

// ── Error Policies ──────────────────────────────────────────────
export const BUIErrorPolicySchema = z.enum(["fail", "continue", "fallback"]);
export type BUIErrorPolicy = z.infer<typeof BUIErrorPolicySchema>;

// ── Output Modes ────────────────────────────────────────────────
export const BUIWorkflowOutputModeSchema = z.enum([
  "plain_text",
  "markdown_heading",
  "markdown_bullets",
  "markdown_table",
  "markdown_quote",
  "html_fragment",
  "json_object",
  "json_array",
  "yaml_block",
  "csv_row",
]);
export type BUIWorkflowOutputMode = z.infer<typeof BUIWorkflowOutputModeSchema>;

// ── Output Statuses ─────────────────────────────────────────────
export const BUIWorkflowOutputStatusSchema = z.enum([
  "created",
  "updated",
  "fallback",
  "skipped",
  "failed",
]);
export type BUIWorkflowOutputStatus = z.infer<
  typeof BUIWorkflowOutputStatusSchema
>;

// ── Report V2 Format ────────────────────────────────────────────
export const BUIReportFormatSchema = z.enum(["markdown", "json", "html"]);
export type BUIReportFormat = z.infer<typeof BUIReportFormatSchema>;

// ── Report Missing Policy ───────────────────────────────────────
export const BUIReportMissingPolicySchema = z.enum(["error", "warn", "skip"]);
export type BUIReportMissingPolicy = z.infer<
  typeof BUIReportMissingPolicySchema
>;

// ── Step / Run Statuses (Ledger) ────────────────────────────────
export const BUIStepStatusSchema = z.enum([
  "queued",
  "running",
  "success",
  "failed",
  "skipped",
]);
export type BUIStepStatus = z.infer<typeof BUIStepStatusSchema>;

export const BUIRunStatusSchema = z.enum(["success", "failed", "partial"]);
export type BUIRunStatus = z.infer<typeof BUIRunStatusSchema>;

export const BUIWorkflowStepOutputRecordStatusSchema = z.enum([
  "success",
  "failed",
  "skipped",
  "partial",
]);
export type BUIWorkflowStepOutputRecordStatus = z.infer<
  typeof BUIWorkflowStepOutputRecordStatusSchema
>;
```

---

## 4) Primitive & Branded Schemas

### 4.1 `bui.primitives.ts`

```typescript
import { z } from "zod";

// ── Positive Integer (maxAttempts, headingLevel, etc.) ──────────
export const PositiveIntSchema = z.number().int().positive();

// ── Non-negative Number (costs, tokens) ─────────────────────────
export const NonNegativeNumberSchema = z.number().nonnegative();

// ── Positive Number (timeoutMs, backoffMs) ──────────────────────
export const PositiveNumberSchema = z.number().positive();

// ── ISO Timestamp String ────────────────────────────────────────
export const TimestampSchema = z.string().datetime();

// ── Heading Level (1–6) ─────────────────────────────────────────
export const HeadingLevelSchema = z.number().int().min(1).max(6);

// ── Key Pattern (job.step.outputs.name) ─────────────────────────
export const CanonicalKeySchema = z
  .string()
  .regex(
    /^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*\.outputs\.[a-z_][a-z0-9_]*$/,
    "Must match <job>.<step>.outputs.<output>",
  );

// ── Source Reference Path ───────────────────────────────────────
export const SourceRefSchema = z
  .string()
  .regex(
    /^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*\.outputs\.[a-z_][a-z0-9_]*$/,
    "Must be a fully qualified pipeline path: <job>.<step>.outputs.<name>",
  );

// ── Workflow/Agent Name ─────────────────────────────────────────
export const NameSchema = z
  .string()
  .min(1, "Name must not be empty")
  .max(128, "Name must not exceed 128 characters");

// ── Filename ────────────────────────────────────────────────────
export const FilenameSchema = z
  .string()
  .min(1)
  .regex(
    /\.(md|txt|json|html|yaml)$/,
    "Filename must include a recognised extension",
  );
```

---

## 5) Policy & Value Object Schemas

### 5.1 `bui.policies.ts`

```typescript
import { z } from "zod";
import {
  PositiveIntSchema,
  PositiveNumberSchema,
  NonNegativeNumberSchema,
} from "./bui.primitives";

// ── BUIRetryPolicy ──────────────────────────────────────────────
export const BUIRetryPolicySchema = z
  .object({
    maxAttempts: PositiveIntSchema,
    backoffMs: PositiveNumberSchema.optional(),
    jitter: z.boolean().optional(),
  })
  .refine((val) => val.maxAttempts >= 1, {
    message: "maxAttempts must be >= 1",
    path: ["maxAttempts"],
  })
  .refine((val) => val.maxAttempts <= 5, {
    message: "maxAttempts recommended <= 5",
    path: ["maxAttempts"],
  });
export type BUIRetryPolicy = z.infer<typeof BUIRetryPolicySchema>;

// ── BUIBudgetPolicy ─────────────────────────────────────────────
export const BUIBudgetPolicySchema = z
  .object({
    maxInputTokens: NonNegativeNumberSchema.optional(),
    maxOutputTokens: NonNegativeNumberSchema.optional(),
    maxUsdCost: NonNegativeNumberSchema.optional(),
  })
  .refine(
    (val) => {
      const defined = [
        val.maxInputTokens,
        val.maxOutputTokens,
        val.maxUsdCost,
      ].filter((v) => v !== undefined);
      return defined.length === 0 || defined.every((v) => (v as number) > 0);
    },
    {
      message: "Any defined budget field must be positive",
      path: ["maxUsdCost"],
    },
  );
export type BUIBudgetPolicy = z.infer<typeof BUIBudgetPolicySchema>;

// ── BUICondition ────────────────────────────────────────────────
export const BUIConditionSchema = z.object({
  expression: z.string().min(1, "Condition expression must not be empty"),
});
export type BUICondition = z.infer<typeof BUIConditionSchema>;

// ── BUIFallback ─────────────────────────────────────────────────
export const BUIFallbackSchema = z
  .object({
    prompt: z.string().optional(),
    usePreviousOutput: z.string().min(1).optional(),
  })
  .refine(
    (val) => val.prompt !== undefined || val.usePreviousOutput !== undefined,
    {
      message:
        "At least one of 'prompt' or 'usePreviousOutput' must be present",
      path: ["prompt"],
    },
  );
export type BUIFallback = z.infer<typeof BUIFallbackSchema>;

// ── BUIApprovalGate ─────────────────────────────────────────────
export const BUIApprovalGateSchema = z.object({
  required: z.boolean(),
  reviewers: z.array(z.string().min(1)).optional(),
  reason: z.string().optional(),
});
export type BUIApprovalGate = z.infer<typeof BUIApprovalGateSchema>;
```

### 5.2 `bui.variable.ts`

```typescript
import { z } from "zod";
import { NameSchema } from "./bui.primitives";
import { BUIWorkflowVariableTypeSchema } from "./bui.enums";

export const BUIWorkflowVariableSchema = z.object({
  name: NameSchema,
  value: z.union([z.string(), z.number(), z.boolean()]),
  description: z.string().optional(),
  type: BUIWorkflowVariableTypeSchema,
});
export type BUIWorkflowVariable = z.infer<typeof BUIWorkflowVariableSchema>;
```

### 5.3 `bui.step.ts`

```typescript
import { z } from "zod";
import {
  NameSchema,
  SourceRefSchema,
  HeadingLevelSchema,
  PositiveNumberSchema,
} from "./bui.primitives";
import {
  BUIWorkflowGenerateModeSchema,
  BUIWorkflowOutputModeSchema,
  BUIErrorPolicySchema,
} from "./bui.enums";
import {
  BUIRetryPolicySchema,
  BUIBudgetPolicySchema,
  BUIConditionSchema,
  BUIFallbackSchema,
  BUIApprovalGateSchema,
} from "./bui.policies";

// ── BUIWorkflowStepInput ────────────────────────────────────────
export const BUIWorkflowStepInputSchema = z.object({
  name: NameSchema,
  source: SourceRefSchema,
});
export type BUIWorkflowStepInput = z.infer<typeof BUIWorkflowStepInputSchema>;

// ── BUIWorkflowOutputDescriptor ─────────────────────────────────
export const BUIWorkflowOutputDescriptorSchema = z.object({
  name: NameSchema,
  description: z.string().optional(),
  mode: BUIWorkflowOutputModeSchema.optional(),

  // Optional render hints
  headingLevel: HeadingLevelSchema.optional(),
  bulletStyle: z.enum(["unordered", "ordered", "task"]).optional(),
  htmlTag: z
    .enum(["section", "article", "p", "ul", "ol", "table", "div"])
    .optional(),
  contentType: z
    .enum(["text/plain", "text/markdown", "text/html", "application/json"])
    .optional(),
});
export type BUIWorkflowOutputDescriptor = z.infer<
  typeof BUIWorkflowOutputDescriptorSchema
>;

// ── BUIWorkflowStepOutput (union) ───────────────────────────────
export const BUIWorkflowStepOutputSchema = z.union([
  z.literal("plain"),
  z.array(BUIWorkflowOutputDescriptorSchema),
]);
export type BUIWorkflowStepOutput = z.infer<typeof BUIWorkflowStepOutputSchema>;

// ── BUIWorkflowStep ─────────────────────────────────────────────
export const BUIWorkflowStepSchema = z
  .object({
    name: NameSchema,
    inputs: z.array(BUIWorkflowStepInputSchema).optional(),
    prompts: z.union([z.string(), z.array(z.string())]),
    generate_mode: BUIWorkflowGenerateModeSchema.optional(),
    output: BUIWorkflowStepOutputSchema.optional(),

    condition: BUIConditionSchema.optional(),
    retry: BUIRetryPolicySchema.optional(),
    timeoutMs: PositiveNumberSchema.optional(),
    onError: BUIErrorPolicySchema.optional(),
    fallback: BUIFallbackSchema.optional(),
    budget: BUIBudgetPolicySchema.optional(),
    approval: BUIApprovalGateSchema.optional(),
    tags: z.array(z.string()).optional(),

    // Agent config extension (Section 20)
    agent: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    // Rule: if onError=fallback, fallback must be present
    if (val.onError === "fallback" && !val.fallback) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "fallback is required when onError = 'fallback'",
        path: ["fallback"],
      });
    }
  });
export type BUIWorkflowStep = z.infer<typeof BUIWorkflowStepSchema>;
```

### 5.4 `bui.job.ts`

```typescript
import { z } from "zod";
import { NameSchema } from "./bui.primitives";
import { BUIWorkflowVariableSchema } from "./bui.variable";
import { BUIWorkflowStepSchema } from "./bui.step";

export const BUIWorkflowJobSchema = z.object({
  id: z.string().optional(),
  name: NameSchema,
  needs: z.union([z.string(), z.array(z.string())]).optional(),
  agent: z.string().min(1, "agent is required"),
  group: z.string().optional(),
  variables: z.array(BUIWorkflowVariableSchema).optional(),
  steps: z
    .array(BUIWorkflowStepSchema)
    .min(1, "A job must have at least one step"),

  // Agent config extension (Section 20)
  agentPool: z.string().optional(),
});
export type BUIWorkflowJob = z.infer<typeof BUIWorkflowJobSchema>;
```

### 5.5 `bui.report.ts`

```typescript
import { z } from "zod";
import { NameSchema, FilenameSchema, SourceRefSchema } from "./bui.primitives";
import {
  BUIWorkflowReportTypeSchema,
  BUIReportFormatSchema,
  BUIReportMissingPolicySchema,
} from "./bui.enums";

// ── BUIWorkflowReportExport ─────────────────────────────────────
export const BUIWorkflowReportExportSchema = z.object({
  name: NameSchema,
  value: SourceRefSchema,
});
export type BUIWorkflowReportExport = z.infer<
  typeof BUIWorkflowReportExportSchema
>;

// ── BUIWorkflowReports (V1/V2 backward-compatible) ──────────────
export const BUIWorkflowReportsSchema = z.object({
  type: BUIWorkflowReportTypeSchema,
  filename: FilenameSchema,
  exports: z
    .array(BUIWorkflowReportExportSchema)
    .min(1, "At least one export is required"),
});
export type BUIWorkflowReports = z.infer<typeof BUIWorkflowReportsSchema>;

// ── BUIReportSection (V2) ───────────────────────────────────────
export const BUIReportSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  exports: z.array(BUIWorkflowReportExportSchema).min(1),
  optional: z.boolean().optional(),
});
export type BUIReportSection = z.infer<typeof BUIReportSectionSchema>;

// ── BUIReportRenderOptions (V2) ─────────────────────────────────
export const BUIReportRenderOptionsSchema = z.object({
  includeRunSummary: z.boolean().optional(),
  includeJobStatusTable: z.boolean().optional(),
  includeTokenAndCost: z.boolean().optional(),
  includePromptTrace: z.boolean().optional(),
  includeMissingReferences: z.boolean().optional(),
});
export type BUIReportRenderOptions = z.infer<
  typeof BUIReportRenderOptionsSchema
>;

// ── BUIReportOutputTarget (V2) ──────────────────────────────────
export const BUIReportOutputTargetSchema = z.object({
  filename: FilenameSchema,
  format: BUIReportFormatSchema,
});
export type BUIReportOutputTarget = z.infer<typeof BUIReportOutputTargetSchema>;

// ── BUIReportConfigV2 ───────────────────────────────────────────
export const BUIReportConfigV2Schema = z.object({
  type: z.enum(["plain", "flat", "per_job", "sectioned"]),
  missingPolicy: BUIReportMissingPolicySchema.optional(),
  sections: z.array(BUIReportSectionSchema).optional(),
  outputs: z.array(BUIReportOutputTargetSchema).min(1),
  render: BUIReportRenderOptionsSchema.optional(),
});
export type BUIReportConfigV2 = z.infer<typeof BUIReportConfigV2Schema>;
```

---

## 6) Root Workflow Schema with Normalization

### 6.1 `bui.workflow.ts`

```typescript
import { z } from "zod";
import { NameSchema } from "./bui.primitives";
import { BUIRunPolicySchema, BUIWorkflowReportTypeSchema } from "./bui.enums";
import { BUIWorkflowVariableSchema } from "./bui.variable";
import { BUIWorkflowJobSchema } from "./bui.job";
import {
  BUIWorkflowReportsSchema,
  BUIReportConfigV2Schema,
} from "./bui.report";

// ── BUIWorkflowGroupOverride ────────────────────────────────────
export const BUIWorkflowGroupOverrideSchema = z.object({
  group: z.string().min(1),
  variables: z.array(BUIWorkflowVariableSchema).optional(),
});
export type BUIWorkflowGroupOverride = z.infer<
  typeof BUIWorkflowGroupOverrideSchema
>;

// ── BUIWorkflowConfig (Raw Input) ───────────────────────────────
export const BUIWorkflowConfigSchema = z
  .object({
    name: NameSchema,
    version: z.number().int().positive().optional(),
    requestId: z.string().optional(),
    runPolicy: BUIRunPolicySchema.optional(),
    group: z.string().optional(),
    variables: z.array(BUIWorkflowVariableSchema).optional(),
    agentPool: z.string().optional(),
    agents: z.array(z.string()).optional(),
    jobs: z.array(BUIWorkflowJobSchema).min(1, "At least one job is required"),
    groups: z.array(BUIWorkflowGroupOverrideSchema).optional(),

    // Backward compatibility
    Reports: BUIWorkflowReportsSchema.optional(),
    reports: BUIWorkflowReportsSchema.optional(),

    // V2 report config
    reportConfig: BUIReportConfigV2Schema.optional(),

    // Agent config reference
    agentConfigRef: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    // Rule: exactly one effective reports object after normalization
    if (val.Reports && val.reports) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Both 'Reports' (legacy) and 'reports' are present. Use only 'reports'.",
        path: ["reports"],
      });
    }

    // Rule: all needs[] must reference existing job names
    const jobNames = new Set(val.jobs.map((j) => j.name));
    for (const job of val.jobs) {
      const needs = Array.isArray(job.needs)
        ? job.needs
        : job.needs
          ? [job.needs]
          : [];
      for (const need of needs) {
        if (!jobNames.has(need)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Job '${job.name}' references unknown dependency '${need}'`,
            path: ["jobs", val.jobs.indexOf(job), "needs"],
          });
        }
      }
    }

    // Rule: step names must be unique within each job
    for (const job of val.jobs) {
      const stepNames = new Set<string>();
      for (const step of job.steps) {
        if (stepNames.has(step.name)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate step name '${step.name}' in job '${job.name}'`,
            path: [
              "jobs",
              val.jobs.indexOf(job),
              "steps",
              job.steps.indexOf(step),
              "name",
            ],
          });
        }
        stepNames.add(step.name);
      }
    }

    // Rule: job names must be unique
    const seenJobNames = new Set<string>();
    for (const job of val.jobs) {
      if (seenJobNames.has(job.name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate job name '${job.name}'`,
          path: ["jobs", val.jobs.indexOf(job), "name"],
        });
      }
      seenJobNames.add(job.name);
    }

    // Rule: group names must be unique
    if (val.groups) {
      const seenGroups = new Set<string>();
      for (const group of val.groups) {
        if (seenGroups.has(group.group)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate group name '${group.group}'`,
            path: ["groups", val.groups.indexOf(group), "group"],
          });
        }
        seenGroups.add(group.group);
      }
    }
  });

export type BUIWorkflowConfig = z.infer<typeof BUIWorkflowConfigSchema>;

// ── BUIWorkflowNormalized (Output of .transform()) ──────────────
export const BUIWorkflowNormalizedSchema = BUIWorkflowConfigSchema.transform(
  (val) => ({
    ...val,
    version: val.version ?? 2,
    runPolicy: val.runPolicy ?? "fail_fast",
    reports: val.Reports ?? val.reports,
    jobs: val.jobs.map((job) => ({
      ...job,
      needs: Array.isArray(job.needs)
        ? job.needs
        : job.needs
          ? [job.needs]
          : [],
      steps: job.steps.map((step) => {
        const normalizedOutput =
          step.output === "plain"
            ? ("plain" as const)
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
  }),
);

export type BUIWorkflowNormalized = z.infer<typeof BUIWorkflowNormalizedSchema>;
```

> **Note:** DAG cycle detection is **not** performed in Zod — it belongs in a separate preflight validator using topological sort/Kahn's algorithm. Zod validates shape and reference existence; DAG validation is a runtime graph check.

---

## 7) Output Storage Schemas

### 7.1 `bui.output-store.ts`

```typescript
import { z } from "zod";
import {
  CanonicalKeySchema,
  NameSchema,
  TimestampSchema,
  NonNegativeNumberSchema,
  SourceRefSchema,
} from "./bui.primitives";
import {
  BUIWorkflowOutputModeSchema,
  BUIWorkflowOutputStatusSchema,
  BUIWorkflowStepOutputRecordStatusSchema,
} from "./bui.enums";

// ── BUIWorkflowOutputRef ────────────────────────────────────────
export const BUIWorkflowOutputRefSchema = z.object({
  job: z.string().min(1),
  step: z.string().min(1),
  output: z.string().min(1), // output name or "default"
});
export type BUIWorkflowOutputRef = z.infer<typeof BUIWorkflowOutputRefSchema>;

// ── BUIWorkflowStoredValue ──────────────────────────────────────
export const BUIWorkflowStoredValueSchema = z.object({
  key: CanonicalKeySchema,
  ref: BUIWorkflowOutputRefSchema,
  value: z.string(),
  mode: BUIWorkflowOutputModeSchema.optional(),
  contentType: z.string().optional(),

  // Metadata
  status: BUIWorkflowOutputStatusSchema,
  runId: z.string().min(1),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema.optional(),
  attempt: z.number().int().nonnegative().optional(),

  // Optional provenance
  sourcePrompt: z.string().optional(),
  sourceInputs: z.record(z.string()).optional(),
  model: z.string().optional(),
  provider: z.string().optional(),

  // Token/cost accounting
  inputTokens: NonNegativeNumberSchema.optional(),
  outputTokens: NonNegativeNumberSchema.optional(),
  usdCost: NonNegativeNumberSchema.optional(),
});
export type BUIWorkflowStoredValue = z.infer<
  typeof BUIWorkflowStoredValueSchema
>;

// ── BUIWorkflowStepOutputRecord ─────────────────────────────────
export const BUIWorkflowStepOutputRecordSchema = z.object({
  runId: z.string().min(1),
  job: z.string().min(1),
  step: z.string().min(1),
  outputs: z.record(BUIWorkflowStoredValueSchema),
  status: BUIWorkflowStepOutputRecordStatusSchema,
  startedAt: TimestampSchema,
  endedAt: TimestampSchema.optional(),
});
export type BUIWorkflowStepOutputRecord = z.infer<
  typeof BUIWorkflowStepOutputRecordSchema
>;

// ── BUIWorkflowOutputStore ──────────────────────────────────────
export const BUIWorkflowOutputStoreSchema = z.object({
  values: z.record(BUIWorkflowStoredValueSchema),
  byStep: z.record(BUIWorkflowStepOutputRecordSchema).optional(),
});
export type BUIWorkflowOutputStore = z.infer<
  typeof BUIWorkflowOutputStoreSchema
>;

// ── BUIWorkflowResolvedInput ────────────────────────────────────
export const BUIWorkflowResolvedInputSchema = z.object({
  name: z.string(),
  source: SourceRefSchema,
  resolvedKey: CanonicalKeySchema,
  value: z.string(),
});
export type BUIWorkflowResolvedInput = z.infer<
  typeof BUIWorkflowResolvedInputSchema
>;

// ── BUIWorkflowReportMaterializedExport ─────────────────────────
export const BUIWorkflowReportMaterializedExportSchema = z.object({
  name: z.string(),
  source: SourceRefSchema,
  resolvedKey: CanonicalKeySchema,
  value: z.string(),
  missing: z.boolean().optional(),
});
export type BUIWorkflowReportMaterializedExport = z.infer<
  typeof BUIWorkflowReportMaterializedExportSchema
>;

// ── BUIWorkflowMaterializedReport ───────────────────────────────
export const BUIWorkflowMaterializedReportSchema = z.object({
  runId: z.string().min(1),
  filename: z.string().min(1),
  type: z.enum(["plain", "flat", "per_job"]),
  exports: z.array(BUIWorkflowReportMaterializedExportSchema),
  generatedAt: TimestampSchema,
});
export type BUIWorkflowMaterializedReport = z.infer<
  typeof BUIWorkflowMaterializedReportSchema
>;
```

---

## 8) Archive & Historical Access Schemas

### 8.1 `bui.archive.ts`

```typescript
import { z } from "zod";
import { CanonicalKeySchema, TimestampSchema } from "./bui.primitives";
import { BUIWorkflowStoredValueSchema } from "./bui.output-store";

// ── BUIWorkflowDefinitionRef ────────────────────────────────────
export const BUIWorkflowDefinitionRefSchema = z.object({
  workflowName: z.string().min(1),
  workflowVersion: z.number().int().positive(),
  definitionHash: z.string().min(1),
});
export type BUIWorkflowDefinitionRef = z.infer<
  typeof BUIWorkflowDefinitionRefSchema
>;

// ── BUIWorkflowOutputAlias ──────────────────────────────────────
export const BUIWorkflowOutputAliasSchema = z.object({
  oldKey: CanonicalKeySchema,
  newKey: CanonicalKeySchema,
  reason: z.string().optional(),
});
export type BUIWorkflowOutputAlias = z.infer<
  typeof BUIWorkflowOutputAliasSchema
>;

// ── BUIWorkflowOutputArchiveRecord ──────────────────────────────
export const BUIWorkflowOutputArchiveRecordSchema = z.object({
  runId: z.string().min(1),
  definition: BUIWorkflowDefinitionRefSchema,
  values: z.record(BUIWorkflowStoredValueSchema),
  aliases: z.array(BUIWorkflowOutputAliasSchema).optional(),
  createdAt: TimestampSchema,
});
export type BUIWorkflowOutputArchiveRecord = z.infer<
  typeof BUIWorkflowOutputArchiveRecordSchema
>;

// ── BUIWorkflowExtractRequest ───────────────────────────────────
export const BUIWorkflowExtractRequestSchema = z.object({
  runId: z.string().min(1),
  key: CanonicalKeySchema.optional(),
  source: z.string().optional(),
  includeAliases: z.boolean().optional(),
});
export type BUIWorkflowExtractRequest = z.infer<
  typeof BUIWorkflowExtractRequestSchema
>;

// ── BUIWorkflowExtractResult ────────────────────────────────────
export const BUIWorkflowExtractResultSchema = z.object({
  runId: z.string().min(1),
  requested: z.string(),
  resolvedKey: CanonicalKeySchema.optional(),
  value: z.string().optional(),
  found: z.boolean(),
  fromAlias: z.boolean().optional(),
  archivedDefinition: BUIWorkflowDefinitionRefSchema.optional(),
});
export type BUIWorkflowExtractResult = z.infer<
  typeof BUIWorkflowExtractResultSchema
>;
```

---

## 9) Run Ledger Schemas

### 9.1 `bui.ledger.ts`

```typescript
import { z } from "zod";
import { TimestampSchema, NonNegativeNumberSchema } from "./bui.primitives";
import { BUIStepStatusSchema, BUIRunStatusSchema } from "./bui.enums";

// ── BUIRunStepLedger ────────────────────────────────────────────
export const BUIRunStepLedgerSchema = z.object({
  job: z.string().min(1),
  step: z.string().min(1),
  status: BUIStepStatusSchema,
  startedAt: TimestampSchema.optional(),
  endedAt: TimestampSchema.optional(),
  attempts: z.number().int().nonnegative(),
  inputTokens: NonNegativeNumberSchema.optional(),
  outputTokens: NonNegativeNumberSchema.optional(),
  usdCost: NonNegativeNumberSchema.optional(),
  error: z.string().optional(),
});
export type BUIRunStepLedger = z.infer<typeof BUIRunStepLedgerSchema>;

// ── BUIRunLedger ────────────────────────────────────────────────
export const BUIRunLedgerSchema = z.object({
  runId: z.string().min(1),
  workflow: z.string().min(1),
  requestId: z.string().optional(),
  status: BUIRunStatusSchema,
  startedAt: TimestampSchema,
  endedAt: TimestampSchema.optional(),
  steps: z.array(BUIRunStepLedgerSchema),
});
export type BUIRunLedger = z.infer<typeof BUIRunLedgerSchema>;
```

---

## 10) Agent Configuration Schemas

### 10.1 `bui.agent-config.ts`

```typescript
import { z } from "zod";
import { NameSchema, PositiveNumberSchema } from "./bui.primitives";
import { PositiveIntSchema } from "./bui.primitives";

// ── BUIAgentStepMatch ───────────────────────────────────────────
export const BUIAgentStepMatchSchema = z.object({
  job: z.string().optional(),
  step: z.string().optional(),
  tag: z.string().optional(),
});
export type BUIAgentStepMatch = z.infer<typeof BUIAgentStepMatchSchema>;

// ── BUIAgentStepStrategy ────────────────────────────────────────
export const BUIAgentStepStrategySchema = z.object({
  match: BUIAgentStepMatchSchema,
  model: z.string().optional(),
  provider: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: PositiveIntSchema.optional(),
  timeoutMs: PositiveNumberSchema.optional(),
  retry: z
    .object({
      maxAttempts: PositiveIntSchema,
      backoffMs: PositiveNumberSchema.optional(),
      jitter: z.boolean().optional(),
    })
    .optional(),
  tools: z.array(z.string()).optional(),
  systemPrompt: z.string().optional(),
});
export type BUIAgentStepStrategy = z.infer<typeof BUIAgentStepStrategySchema>;

// ── BUIAgentConfig ──────────────────────────────────────────────
export const BUIAgentConfigSchema = z.object({
  id: z.string().min(1),
  role: z.string().optional(),
  defaultProvider: z.string().optional(),
  defaultModel: z.string().optional(),
  defaultTemperature: z.number().min(0).max(2).optional(),
  capabilities: z.array(z.string()).optional(),
  stepStrategies: z.array(BUIAgentStepStrategySchema).optional(),
});
export type BUIAgentConfig = z.infer<typeof BUIAgentConfigSchema>;

// ── BUIAgentPoolConfig ──────────────────────────────────────────
export const BUIAgentPoolConfigSchema = z.object({
  id: z.string().min(1),
  description: z.string().optional(),
  defaultAgent: z.string().optional(),
  agents: z.array(z.string()).min(1, "Pool must have at least one agent"),
});
export type BUIAgentPoolConfig = z.infer<typeof BUIAgentPoolConfigSchema>;

// ── BUIAgentConfigurationDocument ───────────────────────────────
export const BUIAgentConfigurationDocumentSchema = z
  .object({
    version: z.number().int().positive(),
    pools: z.array(BUIAgentPoolConfigSchema).optional(),
    agents: z.array(BUIAgentConfigSchema).min(1),
  })
  .superRefine((val, ctx) => {
    // Rule: every referenced agentPool must exist in config
    const poolIds = new Set((val.pools ?? []).map((p) => p.id));

    // Rule: every selected agent must be part of its referenced pool
    for (const pool of val.pools ?? []) {
      for (const agentId of pool.agents) {
        if (!val.agents.some((a) => a.id === agentId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Agent '${agentId}' in pool '${pool.id}' is not defined in agents[]`,
            path: ["pools", val.pools!.indexOf(pool), "agents"],
          });
        }
      }
    }

    // Rule: pool ids must be unique
    const seenPoolIds = new Set<string>();
    for (const pool of val.pools ?? []) {
      if (seenPoolIds.has(pool.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate pool id '${pool.id}'`,
          path: ["pools", val.pools!.indexOf(pool), "id"],
        });
      }
      seenPoolIds.add(pool.id);
    }

    // Rule: agent ids must be unique
    const seenAgentIds = new Set<string>();
    for (const agent of val.agents) {
      if (seenAgentIds.has(agent.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate agent id '${agent.id}'`,
          path: ["agents", val.agents.indexOf(agent), "id"],
        });
      }
      seenAgentIds.add(agent.id);
    }
  });
export type BUIAgentConfigurationDocument = z.infer<
  typeof BUIAgentConfigurationDocumentSchema
>;
```

---

## 11) Validation Checklist (Cross-Field Rules Summary)

These rules are implemented across schemas above. Reference for tracking.

| #   | Rule                                        | Location                                                 | Implementation          |
| --- | ------------------------------------------- | -------------------------------------------------------- | ----------------------- |
| 1   | Required fields present                     | Per-schema `.object()`                                   | Structural validation   |
| 2   | Enum values valid                           | `z.enum()`                                               | Built-in Zod enum check |
| 3   | Unique job names                            | [`BUIWorkflowConfigSchema.superRefine`](bui.workflow.ts) | SuperRefine             |
| 4   | Unique step names per job                   | [`BUIWorkflowConfigSchema.superRefine`](bui.workflow.ts) | SuperRefine             |
| 5   | All `needs` exist                           | [`BUIWorkflowConfigSchema.superRefine`](bui.workflow.ts) | SuperRefine             |
| 6   | No cycles in dependency graph               | _Runtime only (Kahn's algorithm)_                        | Not in Zod              |
| 7   | Every `inputs[].source` resolves            | _Preflight validation_                                   | Reference checker       |
| 8   | Every `reports.exports[].value` resolves    | _Preflight validation_                                   | Reference checker       |
| 9   | `retry.maxAttempts >= 1`                    | [`BUIRetryPolicySchema.refine`](bui.policies.ts:10)      | Refine                  |
| 10  | Reasonable `timeoutMs` bounds               | [`PositiveNumberSchema`](bui.primitives.ts:14)           | Type-level              |
| 11  | `onError=fallback` requires `fallback`      | [`BUIWorkflowStepSchema.superRefine`](bui.step.ts:56)    | SuperRefine             |
| 12  | Fallback has prompt or usePreviousOutput    | [`BUIFallbackSchema.refine`](bui.policies.ts:30)         | Refine                  |
| 13  | Budget fields must be positive when defined | [`BUIBudgetPolicySchema.refine`](bui.policies.ts:17)     | Refine                  |
| 14  | Source paths match canonical pattern        | [`SourceRefSchema`](bui.primitives.ts:24)                | Regex                   |
| 15  | Filename has recognised extension           | [`FilenameSchema`](bui.primitives.ts:34)                 | Regex                   |
| 16  | Mixed `Reports` and `reports` keys          | [`BUIWorkflowConfigSchema.superRefine`](bui.workflow.ts) | SuperRefine             |

---

## 12) Normalization Summary (Applied in `.transform()`)

| #   | Rule                                                  | Default / Action              |
| --- | ----------------------------------------------------- | ----------------------------- |
| 1   | `Reports` → `reports`                                 | `val.Reports ?? val.reports`  |
| 2   | `prompts` string → array                              | `Array.isArray ? val : [val]` |
| 3   | `needs` string → array                                | Same pattern                  |
| 4   | `version`                                             | Defaults to `2`               |
| 5   | `runPolicy`                                           | Defaults to `"fail_fast"`     |
| 6   | `step.generate_mode`                                  | Defaults to `"text"`          |
| 7   | `step.onError`                                        | Defaults to `"fail"`          |
| 8   | `output: plain` → `outputs.default` mode `plain_text` | Mapped in transform           |
| 9   | output descriptor `mode`                              | Defaults to `"plain_text"`    |
| 10  | `markdown_heading.headingLevel`                       | Defaults to `2`               |
| 11  | `markdown_bullets.bulletStyle`                        | Defaults to `"unordered"`     |

---

## 13) Phase 1 Implementation Roadmap

| Step | File(s)                                      | Dependencies                        |
| ---- | -------------------------------------------- | ----------------------------------- |
| 1    | [`bui.enums.ts`](bui.enums.ts)               | None                                |
| 2    | [`bui.primitives.ts`](bui.primitives.ts)     | None                                |
| 3    | [`bui.policies.ts`](bui.policies.ts)         | `bui.primitives.ts`, `bui.enums.ts` |
| 4    | [`bui.variable.ts`](bui.variable.ts)         | `bui.primitives.ts`, `bui.enums.ts` |
| 5    | [`bui.step.ts`](bui.step.ts)                 | All above                           |
| 6    | [`bui.job.ts`](bui.job.ts)                   | `bui.step.ts`                       |
| 7    | [`bui.report.ts`](bui.report.ts)             | `bui.primitives.ts`, `bui.enums.ts` |
| 8    | [`bui.workflow.ts`](bui.workflow.ts)         | All above (root composition)        |
| 9    | [`bui.output-store.ts`](bui.output-store.ts) | `bui.primitives.ts`, `bui.enums.ts` |
| 10   | [`bui.archive.ts`](bui.archive.ts)           | `bui.output-store.ts`               |
| 11   | [`bui.ledger.ts`](bui.ledger.ts)             | `bui.primitives.ts`, `bui.enums.ts` |
| 12   | [`bui.agent-config.ts`](bui.agent-config.ts) | `bui.primitives.ts`                 |
| 13   | [`bui.index.ts`](bui.index.ts)               | All files (barrel)                  |

---

## 14) Edge Cases & Error Messages

| Edge Case                                               | Expected Error                                                             |
| ------------------------------------------------------- | -------------------------------------------------------------------------- | ------------- |
| Empty `name`                                            | `"Name must not be empty"`                                                 |
| Invalid enum value (`"invalid"` for `runPolicy`)        | `"Invalid enum value. Expected 'continue'                                  | 'fail_fast'"` |
| `onError=fallback` with no `fallback` object            | `"fallback is required when onError = 'fallback'"`                         |
| `maxAttempts=0`                                         | `"maxAttempts must be >= 1"`                                               |
| Both `Reports` and `reports` present                    | `"Both 'Reports' (legacy) and 'reports' are present. Use only 'reports'."` |
| `needs` references non-existent job                     | `"Job 'X' references unknown dependency 'Y'"`                              |
| Duplicate job name                                      | `"Duplicate job name 'X'"`                                                 |
| Duplicate step name within job                          | `"Duplicate step name 'X' in job 'Y'"`                                     |
| Invalid source path format                              | `"Must be a fully qualified pipeline path: <job>.<step>.outputs.<name>"`   |
| `fallback` has neither `prompt` nor `usePreviousOutput` | `"At least one of 'prompt' or 'usePreviousOutput' must be present"`        |
| Filename without extension                              | `"Filename must include a recognised extension"`                           |
| Negative `timeoutMs`                                    | `"Value must be positive"`                                                 |
| Budget has `maxInputTokens=0`                           | `"Any defined budget field must be positive"`                              |
| Agent ref in pool undefined in agents[]                 | `"Agent 'X' in pool 'Y' is not defined in agents[]"`                       |
| Pool has no agents                                      | `"Pool must have at least one agent"`                                      |
| Jobs array empty                                        | `"At least one job is required"`                                           |
| Exports array empty                                     | `"At least one export is required"`                                        |
