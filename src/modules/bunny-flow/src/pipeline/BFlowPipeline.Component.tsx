"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bflowPipelineModule } from "./BFlowPipeline";

export default function BFlowPipelineComponent() {
  return (
    <Bunny config={bflowPipelineModule}>
      <BunnyForm />
    </Bunny>
  );
}
