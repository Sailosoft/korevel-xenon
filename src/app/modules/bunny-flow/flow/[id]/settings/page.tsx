"use client";

import { Settings } from "lucide-react";
import { useBFlowFlow } from "@/src/modules/bunny-flow/src/context/BFlowFlowContext";

export const dynamic = "force-dynamic";

export default function FlowSettingsPage() {
  const { flow } = useBFlowFlow();

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center">
          <Settings className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Flow Settings{flow ? ` — ${flow.name}` : ""}
          </h1>
          <p className="text-sm text-slate-400">
            Configure this flow's properties
          </p>
        </div>
      </div>

      {flow && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">
              Flow Code
            </label>
            <p className="text-sm text-slate-400">{flow.code}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Slug</label>
            <p className="text-sm text-slate-400">{flow.slug}</p>
          </div>
          {flow.description && (
            <div>
              <label className="text-sm font-medium text-slate-700">
                Description
              </label>
              <p className="text-sm text-slate-400">{flow.description}</p>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-slate-700">
              Version
            </label>
            <p className="text-sm text-slate-400">{flow.version ?? "—"}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Status</label>
            <span
              className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold ${
                flow.status === "published"
                  ? "bg-emerald-50 text-emerald-600"
                  : flow.status === "archived"
                    ? "bg-slate-100 text-slate-500"
                    : "bg-amber-50 text-amber-600"
              }`}
            >
              {flow.status}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
