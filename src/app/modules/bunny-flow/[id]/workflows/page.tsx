"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { bflowDB } from "@/src/modules/bunny-flow/src/database/BFlowDatabase";
import { Workflow } from "lucide-react";
import { useBFlowFlow } from "@/src/modules/bunny-flow/src/context/BFlowFlowContext";

export const dynamic = "force-dynamic";

export default function FlowWorkflowsPage() {
  const { flowId, flow } = useBFlowFlow();

  const workflows =
    useLiveQuery(
      () =>
        bflowDB.workflowTemplates
          .filter((w) => w.definitionId === flowId)
          .toArray(),
      [flowId],
    ) ?? [];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
          <Workflow className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Workflows{flow ? ` — ${flow.name}` : ""}
          </h1>
          <p className="text-sm text-slate-400">
            Workflow templates defined for this flow
          </p>
        </div>
      </div>

      {workflows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
          <Workflow className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-slate-600 mb-1">
            No Workflows Yet
          </h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Workflow templates define the jobs and steps that make up a CI/CD
            pipeline. Create one to get started.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
          {workflows.map((w: any) => (
            <div
              key={w.id}
              className="flex items-center justify-between p-4 md:p-5"
            >
              <div>
                <p className="text-sm font-semibold text-slate-700">{w.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{w.slug}</p>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">
                {w.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
