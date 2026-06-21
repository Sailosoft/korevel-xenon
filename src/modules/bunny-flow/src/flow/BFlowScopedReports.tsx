// BFlowScopedReports.tsx
//
// Bunny-backed report template list automatically scoped to the current flow
// definition (flowId).  Uses the existing bflowReportModule config but
// injects the flow id from BFlowFlowContext.

"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bflowReportModule } from "../report/BFlowReport";
import { useBFlowFlow } from "../context/BFlowFlowContext";
import { createScopedBunnyConfig } from "./BFlowScopedModule";

export default function BFlowScopedReports() {
  const { flowId } = useBFlowFlow();

  const scopedConfig = createScopedBunnyConfig(
    bflowReportModule,
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
