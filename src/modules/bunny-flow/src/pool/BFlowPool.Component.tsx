"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bflowPoolModule } from "./BFlowPool.Feature";

// ─── Pool Component ─────────────────────────────────────────────────

export default function BFlowPoolComponent() {
  return (
    <Bunny config={bflowPoolModule}>
      <BunnyForm />
    </Bunny>
  );
}
