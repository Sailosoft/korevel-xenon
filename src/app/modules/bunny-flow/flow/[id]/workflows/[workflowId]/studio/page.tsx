/**
 * Route: /modules/bunny-flow/flow/{flowId}/workflows/{workflowId}/studio
 *
 * Workflow Studio — Live YAML editor + in-memory pipeline test runner.
 * Wraps the BFlowWorkflowStudio component inside the flow layout shell.
 */

"use client";

import BFlowWorkflowStudio from "@/src/modules/bunny-flow/src/workflow/BFlowWorkflow.Studio.Component";

// ─── Props ────────────────────────────────────────────────────────────

interface StudioPageProps {
  params: Promise<{ id: string; workflowId: string }>;
}

// ─── Page ─────────────────────────────────────────────────────────────

export default function StudioPage({ params }: StudioPageProps) {
  return <BFlowWorkflowStudio params={params} />;
}
