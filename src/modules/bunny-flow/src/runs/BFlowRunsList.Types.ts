import { z } from "zod";
import { BFlowRunStatusSchema, BFlowRunSnapshotSchema } from "../run/BFlowRun.Types";

// ─── Run Display Item ──────────────────────────────────────────────

/**
 * A display-ready pipeline run item that includes resolved
 * pipeline and workflow names for the runs list UI.
 */
export const BFlowRunDisplayItemSchema = z.object({
  /** GUIDv7 of the pipeline run */
  id: z.string(),
  /** Reference to BFlowPipeline */
  pipelineId: z.string(),
  /** Resolved pipeline name */
  pipelineName: z.string(),
  /** Reference to BFlowDefinition (flow) */
  flowId: z.string(),
  /** Reference to BFlowWorkflowTemplate */
  templateId: z.string(),
  /** Resolved workflow template name */
  workflowName: z.string(),
  /** Current overall status */
  status: BFlowRunStatusSchema,
  /** Run number (incremental) */
  runNumber: z.number().int().optional(),
  /** Snapshot of the workflow structure at run time */
  snapshot: BFlowRunSnapshotSchema.optional(),
  /** Timestamp when pipeline run started */
  startedAt: z.date().optional(),
  /** Timestamp when pipeline run completed */
  completedAt: z.date().optional(),
  /** Created timestamp */
  createdAt: z.date(),
});
export type BFlowRunDisplayItem = z.infer<typeof BFlowRunDisplayItemSchema>;

// ─── Runs List Props ────────────────────────────────────────────────

export interface BFlowRunsListProps {
  /** If provided, filter runs to a specific flow (definition) */
  flowId?: string;
  /** If provided, filter runs to a specific pipeline */
  pipelineId?: string;
}
