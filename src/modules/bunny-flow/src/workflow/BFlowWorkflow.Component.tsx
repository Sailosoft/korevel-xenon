"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bflowWorkflowModule } from "./BFlowWorkflow";

export default function BFlowWorkflowComponent() {
  return (
    <Bunny config={bflowWorkflowModule}>
      <BunnyForm />
    </Bunny>
  );
}
