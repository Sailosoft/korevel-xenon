// BFlowScopedPools.tsx
//
// Bunny-backed pool list automatically scoped to the current
// flow definition (flowId). Uses the existing bflowPoolModule
// config but injects the flow id from BFlowFlowContext.
//
// Also overrides the "view-agents" row action to navigate to the
// flow-scoped agents route (/modules/bunny-flow/flow/{flowId}/pools/{poolId}/agents)
// instead of the top-level /modules/bunny-flow/pools/{poolId}/agents.

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

  // ── Override the "view-agents" row action to navigate to the
  //    flow-scoped route instead of the global pools route.
  scopedConfig.rowActions = (scopedConfig.rowActions ?? []).map((action) => {
    if (action.id === "view-agents") {
      return {
        ...action,
        onClick: (row, context) => {
          const rowData = row as unknown as { id: string };
          context.router.push(
            `/modules/bunny-flow/flow/${flowId}/pools/${rowData.id}/agents`,
          );
        },
      };
    }
    return action;
  });

  return (
    <div className="p-0">
      <Bunny config={scopedConfig}>
        <BunnyForm />
      </Bunny>
    </div>
  );
}
