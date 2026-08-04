// BSScopedPoolAgents.tsx
//
// Bunny-backed agent list automatically scoped to a specific agent pool
// (agentPoolId). Uses the existing bsAgentModule config but injects the
// pool id to scope agents to that pool.
//
// Also renders the "Generate Agents" modal, wired via the custom header
// action override — mirroring Bunny Flow's BFlowScopedPoolAgents.

"use client";

import { useCallback, useEffect, useState } from "react";
import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bsAgentModule } from "./BSAgent.Module";
import { createScopedBunnyConfig } from "./BSScopedModule";
import BSGenerateAgentsModal from "./BSGenerateAgentsModal";
import { bsDB } from "../../BSDatabase";
import type { BSAgentPool } from "../agent-pools/BSAgentPool.Types";

interface BSScopedPoolAgentsProps {
  poolId: string;
}

export default function BSScopedPoolAgents({
  poolId,
}: BSScopedPoolAgentsProps) {
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [pool, setPool] = useState<BSAgentPool | null>(null);
  // Bumping this key remounts <Bunny>, which re-runs the table fetch so
  // newly generated agents show up immediately.
  const [refreshKey, setRefreshKey] = useState(0);

  // Load the pool to get its description for the generate modal
  useEffect(() => {
    bsDB.agentPools
      .get(poolId)
      .then((p) => {
        if (p) setPool(p);
      })
      .catch(() => setPool(null));
  }, [poolId]);

  const scopedConfig = createScopedBunnyConfig(
    bsAgentModule,
    "agentPoolId",
    poolId,
  );

  scopedConfig.beforeFormSubmit = () => ({
    agentPoolId: poolId,
  });

  // ── Replace the "generate-agents" header action with one that
  //    opens our custom modal instead of the default create form.
  scopedConfig.headerActions = (scopedConfig.headerActions ?? []).map(
    (action) => {
      if (action.id === "generate-agents") {
        return {
          ...action,
          onClick: () => setGenerateModalOpen(true),
        };
      }
      return action;
    },
  );

  const handleGenerateModalClose = useCallback(() => {
    setGenerateModalOpen(false);
  }, []);

  const handleGenerated = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="p-0">
      <Bunny key={refreshKey} config={scopedConfig}>
        <BunnyForm />
      </Bunny>

      <BSGenerateAgentsModal
        open={generateModalOpen}
        poolId={poolId}
        poolDescription={pool?.description}
        onClose={handleGenerateModalClose}
        onGenerated={handleGenerated}
      />
    </div>
  );
}
