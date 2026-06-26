/**
 * BFlowWorkflowStudio.Types — Interfaces and types for the workflow studio.
 */

"use client";

export interface BFlowWorkflowStudioProps {
  params: Promise<{ id: string; workflowId: string }>;
}
