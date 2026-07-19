"use client";

import { Users } from "lucide-react";
import { useBFlowFlow } from "@/src/modules/bunny-flow/src/context/BFlowFlowContext";
import BFlowScopedPools from "@/src/modules/bunny-flow/src/pool/BFlowScopedPools";

export default function FlowPoolsPage() {
  const { flow } = useBFlowFlow();

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center">
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Pools{flow ? ` — ${flow.name}` : ""}
          </h1>
          <p className="text-sm text-slate-400">
            Agent pools available for this flow
          </p>
        </div>
      </div>

      <BFlowScopedPools />
    </div>
  );
}
