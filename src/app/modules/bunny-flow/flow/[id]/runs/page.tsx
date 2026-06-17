"use client";

import { Play } from "lucide-react";
import { useBFlowFlow } from "@/src/modules/bunny-flow/src/context/BFlowFlowContext";

export const dynamic = "force-dynamic";

export default function FlowRunsPage() {
  const { flow } = useBFlowFlow();

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
          <Play className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Pipeline Runs{flow ? ` — ${flow.name}` : ""}
          </h1>
          <p className="text-sm text-slate-400">
            Execution history for this flow
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto mb-4">
          <Play className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Pipeline Runs</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Track and monitor the execution history of your pipeline runs. View
          status, duration, and output for each run.
        </p>
      </div>
    </div>
  );
}
