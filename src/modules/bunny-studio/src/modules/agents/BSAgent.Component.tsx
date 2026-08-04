// BSAgent.Component — Agent page rendered through the Bunny framework.
//
// The CRUD UI now comes from the BunnyFeature module (feature: "use
// BunnyFeature instead of creating your own component").
//
// The "Generate Agents" header action opens BSGenerateAgentsModal (AI
// generated agents — optionally assigned to an agent pool).

"use client";

import React, { useCallback, useState } from "react";
import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bsAgentModule } from "./BSAgent.Module";
import BSGenerateAgentsModal from "./BSGenerateAgentsModal";

// ─── Props ─────────────────────────────────────────────────────────────

export interface BSAgentComponentProps {
  /** Restrict to a specific agent pool (optional) */
  agentPoolId?: string;
}

// ─── Component ─────────────────────────────────────────────────────────

export function BSAgentComponent() {
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  // Bumping this key remounts <Bunny>, which re-runs the table fetch so
  // newly generated agents show up immediately.
  const [refreshKey, setRefreshKey] = useState(0);

  // Clone the module config and override the "generate-agents" header action
  // to open the AI generation modal instead of the default create form.
  const config = {
    ...bsAgentModule,
    headerActions: (bsAgentModule.headerActions ?? []).map((action) =>
      action.id === "generate-agents"
        ? { ...action, onClick: () => setGenerateModalOpen(true) }
        : action,
    ),
  } as typeof bsAgentModule;

  const handleGenerated = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Bunny key={refreshKey} config={config}>
          <BunnyForm />
        </Bunny>

        <BSGenerateAgentsModal
          open={generateModalOpen}
          onClose={() => setGenerateModalOpen(false)}
          onGenerated={handleGenerated}
        />
      </div>
    </div>
  );
}

export default BSAgentComponent;
