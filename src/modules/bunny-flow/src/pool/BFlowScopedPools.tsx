// BFlowScopedPools.tsx
//
// Bunny-backed pool list automatically scoped to the current
// flow definition (flowId). Uses the existing bflowPoolModule
// config but injects the flow id from BFlowFlowContext.

"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bflowPoolModule } from "./BFlowPool.Feature";
import { useBFlowFlow } from "../context/BFlowFlowContext";
import { createScopedBunnyConfig } from "../flow/BFlowScopedModule";

export default function BFlowScopedPools() {
  const { flowId } = useBFlowFlow();

  const scopedConfig = createScopedBunnyConfig(
    bflowPoolModule,
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
