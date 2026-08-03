// BSAgent.Component — Agent page rendered through the Bunny framework.
//
// The CRUD UI now comes from the BunnyFeature module (feature: "use
// BunnyFeature instead of creating your own component").

"use client";

import React from "react";
import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bsAgentModule } from "./BSAgent.Module";

// ─── Props ─────────────────────────────────────────────────────────────

export interface BSAgentComponentProps {
  /** Restrict to a specific agent pool (optional) */
  agentPoolId?: string;
}

// ─── Component ─────────────────────────────────────────────────────────

export function BSAgentComponent() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Bunny config={bsAgentModule}>
          <BunnyForm />
        </Bunny>
      </div>
    </div>
  );
}

export default BSAgentComponent;
