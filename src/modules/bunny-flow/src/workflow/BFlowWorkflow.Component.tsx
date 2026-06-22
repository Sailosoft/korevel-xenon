"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import { bflowWorkflowModule } from "./BFlowWorkflow";
import BFlowWorkflowModalBody from "./BFlowWorkflow.ModalBody";

export default function BFlowWorkflowComponent() {
  return (
    <Bunny config={bflowWorkflowModule}>
      <BFlowWorkflowModalBody />
    </Bunny>
  );
}
