"use client";

import { use, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, List } from "lucide-react";
import Link from "next/link";
import { bflowDB } from "@/src/modules/bunny-flow/src/database/BFlowDatabase";
import BFlowScopedFlowVariables from "@/src/modules/bunny-flow/src/flow-variable/BFlowScopedFlowVariables";

export const dynamic = "force-dynamic";

interface FlowVariableGroupDetailPageProps {
  params: Promise<{ id: string; groupId: string }>;
}

export default function FlowVariableGroupDetailPage({
  params,
}: FlowVariableGroupDetailPageProps) {
  const { id: flowId, groupId } = use(params);

  const group = useLiveQuery(
    () => bflowDB.variableGroups.get(groupId),
    [groupId],
  );

  const variablesCount = useLiveQuery(
    () => bflowDB.flowVariables.where("groupId").equals(groupId).count(),
    [groupId],
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── Back navigation ── */}
      <Link
        href={`/modules/bunny-flow/flow/${flowId}/variables`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#ff2d20] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Variable Groups
      </Link>

      {/* ── Group Header ── */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-100">
          <List className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {group?.name ?? "Loading..."}
          </h1>
          <p className="text-sm text-slate-400">
            {group?.slug ?? ""}
            {variablesCount !== undefined
              ? ` — ${variablesCount} variable${variablesCount !== 1 ? "s" : ""}`
              : ""}
          </p>
        </div>
      </div>

      {/* ── Variables List (Bunny-backed) ── */}
      <BFlowScopedFlowVariables groupId={groupId} />
    </div>
  );
}
