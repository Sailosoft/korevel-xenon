"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { bflowDB } from "@/src/modules/bunny-flow/src/database/BFlowDatabase";
import { FileBarChart } from "lucide-react";
import { useBFlowFlow } from "@/src/modules/bunny-flow/src/context/BFlowFlowContext";

export const dynamic = "force-dynamic";

export default function FlowReportsPage() {
  const { flowId, flow } = useBFlowFlow();

  const reports =
    useLiveQuery(
      () =>
        bflowDB.reportTemplates.filter((r) => r.flowId === flowId).toArray(),
      [flowId],
    ) ?? [];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center">
          <FileBarChart className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Reports{flow ? ` — ${flow.name}` : ""}
          </h1>
          <p className="text-sm text-slate-400">
            Report templates for this flow
          </p>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
          <FileBarChart className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-slate-600 mb-1">
            No Reports Yet
          </h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Report templates define how pipeline results are visualized and
            exported.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
          {reports.map((r: any) => (
            <div
              key={r.id}
              className="flex items-center justify-between p-4 md:p-5"
            >
              <div>
                <p className="text-sm font-semibold text-slate-700">{r.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{r.code}</p>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">
                {r.mode ?? "standard"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
