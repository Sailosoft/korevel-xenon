// BFlowScopedVariables.tsx
//
// Bunny-backed variable group list automatically scoped to the current flow
// definition (flowId).  Uses the existing bflowVariableGroupModule config but
// injects the flow id from BFlowFlowContext.
//
// Also scopes the workflow selector in the variable group form to only
// show workflow templates belonging to the current flow.

"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bflowVariableGroupModule } from "../variable/BFlowVariableGroup";
import { useBFlowFlow } from "../context/BFlowFlowContext";
import { createScopedBunnyConfig } from "./BFlowScopedModule";
import { bflowDB } from "../database/BFlowDatabase";

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

  // ── Scope the workflowId field options to the current flow ─────────
  // The workflow selector should only list workflows belonging to this flow.
  const rawForm = scopedConfig.formConfig;
  if (rawForm && typeof rawForm !== "function") {
    scopedConfig.formConfig = {
      ...rawForm,
      fields: rawForm.fields.map((field) => {
        if (field.name === "workflowId") {
          return {
            ...field,
            options: () =>
              bflowDB.workflowTemplatesRepo.toSelectOptionsByFlowId(flowId),
          };
        }
        return field;
      }),
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
