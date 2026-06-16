"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bflowVariableGroupModule } from "./BFlowVariableGroup";

export default function BFlowVariableGroupComponent() {
  return (
    <Bunny config={bflowVariableGroupModule}>
      <BunnyForm />
    </Bunny>
  );
}
