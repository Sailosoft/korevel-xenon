// BSAgentPool.Component — Agent Pool page rendered through the Bunny framework.
//
// The CRUD UI now comes from the BunnyFeature module (feature: "use
// BunnyFeature instead of creating your own component").

"use client";

import React from "react";
import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bsAgentPoolModule } from "./BSAgentPool.Module";

// ─── Component ─────────────────────────────────────────────────────────

export function BSAgentPoolComponent() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Bunny config={bsAgentPoolModule}>
          <BunnyForm />
        </Bunny>
      </div>
    </div>
  );
}

export default BSAgentPoolComponent;
