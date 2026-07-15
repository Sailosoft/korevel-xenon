// BFlowScopedPoolAgents.tsx
//
// Bunny-backed pool agent list automatically scoped to a specific pool
// (poolId). Uses the existing bflowPoolAgentModule config but
// injects the pool id to scope agents to that pool.
//
// Also renders the "Generate Agent Team" modal, wired via the custom
// header action render.

"use client";

import { useCallback, useEffect, useState } from "react";
import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bflowPoolAgentModule } from "./BFlowPoolAgent.Feature";
import { createScopedBunnyConfig } from "../flow/BFlowScopedModule";
import BFlowGenerateTeamModal from "./BFlowGenerateTeamModal";
import { bflowDB } from "../database/BFlowDatabase";
import type { BFlowPoolEntity } from "./BFlowPool.Types";

interface BFlowScopedPoolAgentsProps {
  poolId: string;
}

export default function BFlowScopedPoolAgents({
  poolId,
}: BFlowScopedPoolAgentsProps) {
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [pool, setPool] = useState<BFlowPoolEntity | null>(null);

  // Load the pool to get its description for the generate modal
  useEffect(() => {
    bflowDB.pools.get(poolId).then((p) => {
      if (p) setPool(p);
    }).catch(() => setPool(null));
  }, [poolId]);

  const scopedConfig = createScopedBunnyConfig(
    bflowPoolAgentModule,
    "poolId",
    poolId,
  );

  scopedConfig.beforeFormSubmit = () => ({
    poolId,
  });

  // ── Replace the "Generate Agents" header action with one that
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

  return (
    <div className="p-0">
      <Bunny config={scopedConfig}>
        <BunnyForm />
      </Bunny>

      <BFlowGenerateTeamModal
        open={generateModalOpen}
        poolId={poolId}
        poolDescription={pool?.description}
        onClose={handleGenerateModalClose}
      />
    </div>
  );
}
