"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { BFlowAgentPoolFeature } from "./BFlowAgentPool.Feature";

// ─── Agent Pool Component ───────────────────────────────────────────

export default function BFlowAgentPoolComponent() {
  return (
    <Bunny config={BFlowAgentPoolFeature}>
      <BunnyForm />
    </Bunny>
  );
}
