// BSAgentPool.Component — Agent Pool page rendered through the Bunny framework.
//
// The CRUD UI now comes from the BunnyFeature module (feature: "use
// BunnyFeature instead of creating your own component").
//
// The "Generate Pool" header action opens BSGenerateAgentPoolModal (AI
// generated agent pool + its initial agents).

"use client";

import React, { useCallback, useState } from "react";
import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bsAgentPoolModule } from "./BSAgentPool.Module";
import BSGenerateAgentPoolModal from "./BSGenerateAgentPoolModal";

// ─── Component ─────────────────────────────────────────────────────────

export function BSAgentPoolComponent() {
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  // Bumping this key remounts <Bunny>, which re-runs the table fetch so
  // a newly generated pool shows up immediately.
  const [refreshKey, setRefreshKey] = useState(0);

  // Clone the module config and override the "generate-pool" header action
  // to open the AI generation modal instead of the default create form.
  const config = {
    ...bsAgentPoolModule,
    headerActions: (bsAgentPoolModule.headerActions ?? []).map((action) =>
      action.id === "generate-pool"
        ? { ...action, onClick: () => setGenerateModalOpen(true) }
        : action,
    ),
  } as typeof bsAgentPoolModule;

  const handleGenerated = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Bunny key={refreshKey} config={config}>
          <BunnyForm />
        </Bunny>

        <BSGenerateAgentPoolModal
          open={generateModalOpen}
          onClose={() => setGenerateModalOpen(false)}
          onGenerated={handleGenerated}
        />
      </div>
    </div>
  );
}

export default BSAgentPoolComponent;
