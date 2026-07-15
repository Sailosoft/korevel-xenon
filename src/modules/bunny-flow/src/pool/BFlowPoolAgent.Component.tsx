"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bflowPoolAgentModule } from "./BFlowPoolAgent.Feature";

// ─── Pool Agent Component ────────────────────────────────────────────

export default function BFlowPoolAgentComponent() {
  return (
    <Bunny config={bflowPoolAgentModule}>
      <BunnyForm />
    </Bunny>
  );
}
