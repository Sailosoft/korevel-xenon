// BFlowScopedPipelines.tsx
//
// Bunny-backed pipeline list automatically scoped to the current flow
// definition (flowId).  Uses the existing bflowPipelineModule config but
// injects the flow id from BFlowFlowContext.  Also scopes the
// variableGroupId select so it only shows groups belonging to this flow.

"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import type { BunnyFormConfig } from "@/src/modules/bunny/src/form/BunnyForm.Interface";
import { bflowDB } from "../database/BFlowDatabase";
import { bflowPipelineModule } from "../pipeline/BFlowPipeline";
import { useBFlowFlow } from "../context/BFlowFlowContext";
import { createScopedBunnyConfig } from "./BFlowScopedModule";

export default function BFlowScopedPipelines() {
  const { flowId } = useBFlowFlow();

  const scopedConfig = createScopedBunnyConfig(
    bflowPipelineModule,
    "flowId",
    flowId,
  );

  // ── Also scope the variableGroupId dropdown to this flow ─────────
  const rawForm = scopedConfig.formConfig;
  if (rawForm && typeof rawForm !== "function") {
    scopedConfig.formConfig = {
      ...(rawForm as BunnyFormConfig<Record<string, unknown>>),
      fields: (rawForm as BunnyFormConfig<Record<string, unknown>>).fields.map(
        (field) => {
          if (field.name === "variableGroupId") {
            return {
              ...field,
              options: () =>
                bflowDB.variableGroups
                  .filter((vg) => vg.flowId === flowId)
                  .toArray()
                  .then((items) =>
                    items.map((item) => ({
                      label: item.name,
                      value: item.id,
                    })),
                  ),
            };
          }
          return field;
        },
      ),
    };
  }

  return (
    <div className="p-0">
      <Bunny config={scopedConfig}>
        <BunnyForm />
      </Bunny>
    </div>
  );
}
