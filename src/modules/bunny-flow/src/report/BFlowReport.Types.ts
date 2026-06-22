import { z } from "zod";

// ─── Shared Primitives ─────────────────────────────────────────────

const GuidSchema = z.string().min(1);

// ─── Report ────────────────────────────────────────────────────────

export const BFlowReportModeSchema = z.enum([
  "default",
  "plain",
  "html",
  "markdown",
]);
export type BFlowReportMode = z.infer<typeof BFlowReportModeSchema>;

export const BFlowReportSchema = z.object({
  id: GuidSchema,
  /**
   * This will convert the value to specific format.
   * Markdown is the output and convert it to html.
   */
  mode: BFlowReportModeSchema,
  /** Add Title On Flow Report */
  title: z.string().optional(),
});
export type BFlowReport = z.infer<typeof BFlowReportSchema>;

// ─── Report Template ───────────────────────────────────────────────

export const BFlowReportTemplateSchema = z.object({
  id: GuidSchema,
  /** GUID reference to BFlowWorkflowTemplate */
  workflowId: z.string(),
  /** GUID reference to BFlowDefinition */
  flowId: z.string(),
  /** Filename of the report */
  filename: z.string(),
  /** Reports collection */
  reports: z.array(BFlowReportSchema),
});
export type BFlowReportTemplateEntity = z.infer<
  typeof BFlowReportTemplateSchema
>;

// ─── Pipeline Report ───────────────────────────────────────────────

export const BFlowPipelineReportTypeSchema = z.enum(["html", "json", "md"]);
export type BFlowPipelineReportType = z.infer<
  typeof BFlowPipelineReportTypeSchema
>;

/**
 * Used to accumulate result of report then make it downloadable as single file html, json, or md.
 */
export const BFlowPipelineReportSchema = z.object({
  /** GUID */
  id: GuidSchema,
  /** Reference to BFlowPipeline */
  pipelineId: z.string(),
  /** GUID reference to BFlowReportTemplate */
  templateId: z.string(),
  /** GUID reference to BFlowDefinition */
  flowId: z.string(),
  /** GUID reference to BFlowVariableGroup */
  variableGroupId: z.string(),
  /** GUID reference to BFlowPipelineStore */
  storeId: z.string(),
  /** Type of the report */
  type: BFlowPipelineReportTypeSchema,
  /** Created timestamp */
  createdAt: z.date(),
  /** Updated timestamp */
  updatedAt: z.date(),
});
export type BFlowPipelineReportEntity = z.infer<
  typeof BFlowPipelineReportSchema
>;

// ─── Report Snapshot ───────────────────────────────────────────────

/**
 * Used in case template changes or updates after pipeline is created.
 * You can still download or view previous pipeline report.
 */
export const BFlowReportSnapshotSchema = z.object({
  id: GuidSchema,
  pipelineId: z.string(),
  version: z.number().int(),
  variables: z.record(z.string(), z.unknown()),
  /** Reference to BFlowReportTemplate objects */
  snapshot: z.record(z.string(), z.unknown()),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type BFlowReportSnapshotEntity = z.infer<
  typeof BFlowReportSnapshotSchema
>;

// ─── Form Schema (user-editable fields only) ─────────────────────────

/**
 * Form schema for creating/updating a report template.
 * Excludes auto-generated fields: `id`.
 */
export const BFlowReportTemplateFormSchema = z.object({
  workflowId: z.string().min(1, "Workflow is required"),
  flowId: z.string().min(1, "Flow definition is required"),
  filename: z.string().min(1, "Filename is required"),
  reports: z
    .array(
      z.object({
        mode: z.enum(["default", "plain", "html", "markdown"]),
        title: z.string().optional(),
      }),
    )
    .optional(),
});

export type BFlowReportTemplateForm = z.infer<
  typeof BFlowReportTemplateFormSchema
>;
