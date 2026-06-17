"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bflowGlobalVariableModule } from "./BFlowGlobalVariable";

export default function BFlowGlobalVariableComponent() {
  return (
    <Bunny config={bflowGlobalVariableModule}>
      <BunnyForm />
    </Bunny>
  );
}
