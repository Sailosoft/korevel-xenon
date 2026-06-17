"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { bflowDB } from "@/src/modules/bunny-flow/src/database/BFlowDatabase";
import { Container } from "lucide-react";
import { useBFlowFlow } from "@/src/modules/bunny-flow/src/context/BFlowFlowContext";

export const dynamic = "force-dynamic";

export default function FlowPipelinesPage() {
  const { flowId, flow } = useBFlowFlow();

  const pipelines =
    useLiveQuery(
      () => bflowDB.pipelines.filter((p) => p.flowId === flowId).toArray(),
      [flowId],
    ) ?? [];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
          <Container className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Pipelines{flow ? ` — ${flow.name}` : ""}
          </h1>
          <p className="text-sm text-slate-400">
            Pipeline instances for this flow
          </p>
        </div>
      </div>

      {pipelines.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
          <Container className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-slate-600 mb-1">
            No Pipelines Yet
          </h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Pipelines are created by running a workflow template with specific
            variables and configuration.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
          {pipelines.map((p: any) => (
            <div
              key={p.id}
              className="flex items-center justify-between p-4 md:p-5"
            >
              <div>
                <p className="text-sm font-semibold text-slate-700">{p.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">v{p.version}</p>
              </div>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  p.status === "completed"
                    ? "bg-emerald-50 text-emerald-600"
                    : p.status === "running"
                      ? "bg-amber-50 text-amber-600"
                      : p.status === "failed"
                        ? "bg-red-50 text-red-600"
                        : "bg-slate-100 text-slate-500"
                }`}
              >
                {p.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
