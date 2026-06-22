// BFlowScopedWorkflows.tsx
//
// Bunny-backed workflow template list automatically scoped to the current
// flow definition (definitionId).  Uses the existing bflowWorkflowModule
// config but injects the flow id from BFlowFlowContext.

"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bflowWorkflowModule } from "../workflow/BFlowWorkflow";
import { useBFlowFlow } from "../context/BFlowFlowContext";
import { createScopedBunnyConfig } from "./BFlowScopedModule";

export default function BFlowScopedWorkflows() {
  const { flowId } = useBFlowFlow();

  const scopedConfig = createScopedBunnyConfig(
    bflowWorkflowModule,
    "flowId",
    flowId,
  );

  scopedConfig.beforeFormSubmit = (data, mode) => {
    return {
      flowId: flowId,
    };
  };

  return (
    <div className="p-0">
      <Bunny config={scopedConfig}>
        <BunnyForm />
      </Bunny>
    </div>
  );
}
