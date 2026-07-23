"use client";

import { Settings, Code } from "lucide-react";
import { useBFlowFlow } from "@/src/modules/bunny-flow/src/context/BFlowFlowContext";
import {
  useBFlowEditorSettings,
  EDITOR_OPTIONS,
} from "@/src/modules/bunny-flow/src/settings/BFlowEditorSettings";

export default function FlowSettingsPage() {
  const { flow } = useBFlowFlow();
  const { editorKind, setEditorKind } = useBFlowEditorSettings();

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

      {/* ── Editor Preference ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
            <Code className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-700">
              YAML Editor Preference
            </h2>
            <p className="text-xs text-slate-400">
              Choose the code editor used in the Workflow Studio for editing
              YAML workflow definitions. This is a global preference.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {EDITOR_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setEditorKind(opt.value)}
              className={`text-left p-3 rounded-xl border-2 transition-all ${
                editorKind === opt.value
                  ? "border-blue-500 bg-blue-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    editorKind === opt.value
                      ? "border-blue-500"
                      : "border-slate-300"
                  }`}
                >
                  {editorKind === opt.value && (
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </div>
                <span
                  className={`text-sm font-semibold ${
                    editorKind === opt.value
                      ? "text-blue-700"
                      : "text-slate-700"
                  }`}
                >
                  {opt.label}
                </span>
              </div>
              <p className="text-xs text-slate-400 ml-6">{opt.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
