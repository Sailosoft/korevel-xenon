"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bflowDefinitionModule } from "./BFlowDefinition";

export default function BFlowDefinitionComponent() {
  return (
    <Bunny config={bflowDefinitionModule}>
      <BunnyForm />
    </Bunny>
  );
}
