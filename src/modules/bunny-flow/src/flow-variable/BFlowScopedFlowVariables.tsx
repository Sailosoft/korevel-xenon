// BFlowScopedFlowVariables.tsx
//
// Bunny-backed flow variable list automatically scoped to the current
// variable group (groupId). Uses the existing bflowFlowVariableModule
// config but injects the group id.

"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bflowFlowVariableModule } from "./BFlowFlowVariable";
import { createScopedBunnyConfig } from "../flow/BFlowScopedModule";

interface BFlowScopedFlowVariablesProps {
  groupId: string;
}

export default function BFlowScopedFlowVariables({
  groupId,
}: BFlowScopedFlowVariablesProps) {
  const scopedConfig = createScopedBunnyConfig(
    bflowFlowVariableModule,
    "groupId",
    groupId,
  );

  scopedConfig.beforeFormSubmit = () => ({
    groupId,
  });

  return (
    <div className="p-0">
      <Bunny config={scopedConfig}>
        <BunnyForm />
      </Bunny>
    </div>
  );
}
