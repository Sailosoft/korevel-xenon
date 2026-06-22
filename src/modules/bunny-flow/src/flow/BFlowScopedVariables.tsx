// BFlowScopedVariables.tsx
//
// Bunny-backed variable group list automatically scoped to the current flow
// definition (flowId).  Uses the existing bflowVariableGroupModule config but
// injects the flow id from BFlowFlowContext.

"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bflowVariableGroupModule } from "../variable/BFlowVariableGroup";
import { useBFlowFlow } from "../context/BFlowFlowContext";
import { createScopedBunnyConfig } from "./BFlowScopedModule";

export default function BFlowScopedVariables() {
  const { flowId } = useBFlowFlow();

  const scopedConfig = createScopedBunnyConfig(
    bflowVariableGroupModule,
    "flowId",
    flowId,
  );

  scopedConfig.beforeFormSubmit = () => ({
    flowId,
  });

  return (
    <div className="p-0">
      <Bunny config={scopedConfig}>
        <BunnyForm />
      </Bunny>
    </div>
  );
}
