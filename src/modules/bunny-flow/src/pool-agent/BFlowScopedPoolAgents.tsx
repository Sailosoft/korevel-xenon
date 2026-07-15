// BFlowScopedPoolAgents.tsx
//
// Bunny-backed pool agent list automatically scoped to a specific agent
// pool (poolId). Uses the existing bflowPoolAgentModule config but
// injects the pool id to scope agents to that pool.
//
// Also renders the "Generate Agent Team" modal, wired via the custom
// header action render.

"use client";

import { useCallback, useState } from "react";
import { Button } from "@heroui/react";
import { WandSparkles } from "lucide-react";
import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bflowPoolAgentModule } from "./BFlowPoolAgent.Feature";
import { createScopedBunnyConfig } from "../flow/BFlowScopedModule";
import BFlowGenerateTeamModal from "./BFlowGenerateTeamModal";
import type { BunnyKernel } from "@/src/modules/bunny/src/Bunny.Interface";

interface BFlowScopedPoolAgentsProps {
  poolId: string;
}

export default function BFlowScopedPoolAgents({
  poolId,
}: BFlowScopedPoolAgentsProps) {
  const [generateModalOpen, setGenerateModalOpen] = useState(false);

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
        onClose={handleGenerateModalClose}
      />
    </div>
  );
}
