"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bflowFlowVariableModule } from "./BFlowFlowVariable";

export default function BFlowFlowVariableComponent() {
  return (
    <Bunny config={bflowFlowVariableModule}>
      <BunnyForm />
    </Bunny>
  );
}
