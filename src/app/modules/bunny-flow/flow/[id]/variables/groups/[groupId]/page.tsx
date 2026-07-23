/**
 * Route: /modules/bunny-flow/flow/{flowId}/variables/groups/{groupId}
 *
 * Variable Group Detail page.
 * Thin wrapper that extracts route params and delegates to the
 * BFlowVariableGroupDetail component.
 */

"use client";

import { use } from "react";
import BFlowVariableGroupDetail from "@/src/modules/bunny-flow/src/variable/BFlowVariableGroupDetail.Component";

// ─── Props ────────────────────────────────────────────────────────────

interface FlowVariableGroupDetailPageProps {
  params: Promise<{ id: string; groupId: string }>;
}

// ─── Page ─────────────────────────────────────────────────────────────

export default function FlowVariableGroupDetailPage({
  params,
}: FlowVariableGroupDetailPageProps) {
  const { id: flowId, groupId } = use(params);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <BFlowVariableGroupDetail flowId={flowId} groupId={groupId} />
    </div>
  );
}
