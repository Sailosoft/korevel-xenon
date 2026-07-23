"use client";

import { Settings, Brain, ChevronDown, ChevronUp, Code } from "lucide-react";
import { useState } from "react";
import { BFlowGlobalAIConfigComponent } from "./BFlowAIConfig.Component";
import {
  useBFlowEditorSettings,
  EDITOR_OPTIONS,
} from "../settings/BFlowEditorSettings";

export default function BFlowSettingsPage() {
  const [aiExpanded, setAiExpanded] = useState(false);
  const { editorKind, setEditorKind } = useBFlowEditorSettings();

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-100 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Settings</h2>
            <p className="text-sm text-slate-400">
              Configure your BFlow workspace
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* ── General ─────────────────────────────────────────── */}
          <div className="p-4 rounded-xl bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">
              General
            </h3>
            <p className="text-sm text-slate-400">
              General workspace settings and preferences for Bunny Flow.
            </p>
          </div>

          {/* ── Editor Preference ────────────────────────────────── */}
          <div className="rounded-xl bg-slate-50 overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                  <Code className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">
                    YAML Editor Preference
                  </h3>
                  <p className="text-xs text-slate-400">
                    Choose the code editor used in the Workflow Studio for
                    editing YAML workflow definitions.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
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
                    <p className="text-xs text-slate-400 ml-6">
                      {opt.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Database ────────────────────────────────────────── */}
          <div className="p-4 rounded-xl bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">
              Database
            </h3>
            <p className="text-sm text-slate-400">
              Bunny Flow uses an indexed database (via PhazeDB/Dexie) for local
              storage. All flow definitions, workflows, pipelines, and reports
              are stored locally.
            </p>
          </div>

          {/* ── AI Management ───────────────────────────────────── */}
          <div className="rounded-xl bg-slate-50 overflow-hidden">
            <button
              onClick={() => setAiExpanded(!aiExpanded)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-semibold text-slate-700">
                    AI Management
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configure AI providers and models for agent-based workflow
                    execution. Integrated with Helix AI.
                  </p>
                </div>
              </div>
              {aiExpanded ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>

            {aiExpanded && (
              <div className="px-4 pb-4">
                <div className="border-t border-slate-200 pt-4">
                  {/* ── Level 1: Global AI Config ─────────────── */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      <h4 className="text-sm font-semibold text-slate-700">
                        Global AI Configuration
                      </h4>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">
                        Level 1 — Fallback
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3 ml-4">
                      Default AI provider and model for the entire Bunny Flow
                      workspace. Used when no flow-level or pipeline-level
                      config is set.
                    </p>
                    <div className="ml-4 bg-white rounded-lg border border-slate-200 p-3">
                      <BFlowGlobalAIConfigComponent />
                    </div>
                  </div>

                  {/* ── Level 2: Flow AI Config ────────────────── */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <h4 className="text-sm font-semibold text-slate-700">
                        Flow AI Configuration
                      </h4>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">
                        Level 2 — Overrides Global
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3 ml-4">
                      AI configuration scoped to a specific flow definition.
                      Overrides the global config when a pipeline runs within
                      this flow. Set this per flow from the flow dashboard.
                    </p>
                    <div className="ml-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-xs text-amber-700">
                        Navigate to a specific flow definition to configure
                        its AI settings. The flow-level config will
                        automatically take precedence over the global config
                        when pipelines run within that flow.
                      </p>
                    </div>
                  </div>

                  {/* ── Level 3: Pipeline AI Config ────────────── */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <h4 className="text-sm font-semibold text-slate-700">
                        Pipeline AI Configuration
                      </h4>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">
                        Level 3 — Highest Priority
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3 ml-4">
                      AI configuration scoped to a specific pipeline, with
                      optional per-job overrides. Overrides both the global
                      and flow-level configs. Configure this from the pipeline
                      detail view.
                    </p>
                    <div className="ml-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <p className="text-xs text-emerald-700">
                        Navigate to a specific pipeline to set its AI config
                        and optionally configure different models for
                        individual jobs within the workflow.
                      </p>
                    </div>
                  </div>

                  {/* ── Resolution Info ────────────────────────── */}
                  <div className="bg-indigo-50 rounded-lg border border-indigo-200 p-3">
                    <h5 className="text-xs font-semibold text-indigo-700 mb-1">
                      Resolution Priority
                    </h5>
                    <p className="text-xs text-indigo-600">
                      When a pipeline executes, the system resolves the
                      effective AI configuration in this order:{/* */}
                      <strong className="font-semibold">
                        {" "}
                        Pipeline → Flow → Global
                      </strong>
                      . Each level inherits from the parent if not specified.
                      Per-job overrides at the pipeline level take highest
                      priority for their respective job.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Integrations ────────────────────────────────────── */}
          <div className="p-4 rounded-xl bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">
              Integrations
            </h3>
            <p className="text-sm text-slate-400">
              Connect with Helix AI service for agent-based workflow execution.
              AI configuration is managed in the{" "}
              <strong>AI Management</strong> section above.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
