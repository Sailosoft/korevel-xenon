"use client";

import { Brain, Info } from "lucide-react";
import { useBFlowFlow } from "../../src/context/BFlowFlowContext";
import BFlowScopedFlowAIConfig from "../../src/ai-config/BFlowScopedFlowAIConfig";

interface BFlowFlowAIConfigPageProps {
  flowId: string;
}

export default function BFlowFlowAIConfigPage({
  flowId,
}: BFlowFlowAIConfigPageProps) {
  const { flow } = useBFlowFlow();

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            AI Configuration{flow ? ` — ${flow.name}` : ""}
          </h1>
          <p className="text-sm text-slate-400">
            AI provider and model settings scoped to this flow definition
          </p>
        </div>
      </div>

      {/* ── Info Banner ─────────────────────────────────────────── */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100">
        <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-700">
          <p className="font-semibold mb-1">
            Flow AI Configuration (Level 2 — Overrides Global)
          </p>
          <p>
            This AI configuration is scoped to this specific flow definition.
            It overrides the global AI config when pipelines run within this flow.
            Pipelines within this flow can further override with their own config.
          </p>
        </div>
      </div>

      {/* ── Scoped Flow AI Config ───────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6">
        <BFlowScopedFlowAIConfig flowId={flowId} />
      </div>
    </div>
  );
}
