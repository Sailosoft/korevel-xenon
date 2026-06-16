"use client";

import BFlowWorkflowComponent from "@/src/modules/bunny-flow/src/workflow/BFlowWorkflow.Component";

export const dynamic = "force-dynamic";

export default function WorkflowsPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <BFlowWorkflowComponent />
    </div>
  );
}
