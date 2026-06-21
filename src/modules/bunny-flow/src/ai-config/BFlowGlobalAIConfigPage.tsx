"use client";

import { Brain, Info } from "lucide-react";
import { BFlowGlobalAIConfigComponent } from "./BFlowAIConfig.Component";

export default function BFlowGlobalAIConfigPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            AI Configuration
          </h1>
          <p className="text-sm text-slate-400">
            Global AI provider and model settings for Bunny Flow
          </p>
        </div>
      </div>

      {/* ── Info Banner ─────────────────────────────────────────── */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-50 border border-indigo-100">
        <Info className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
        <div className="text-sm text-indigo-700">
          <p className="font-semibold mb-1">Global AI Configuration (Level 1)</p>
          <p>
            This is the fallback AI configuration for the entire Bunny Flow workspace.
            It is used when no flow-level or pipeline-level AI config has been set.
            Flow-level and pipeline-level configurations automatically override this.
          </p>
        </div>
      </div>

      {/* ── Global Config Table ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6">
        <BFlowGlobalAIConfigComponent />
      </div>
    </div>
  );
}
