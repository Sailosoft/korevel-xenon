"use client";

// BKGenerateStepsModal.tsx
//
// Reusable modal that produces train-of-thought steps via Generative AI.
// Lets the user pick a production mode (Analytic, Plan, SDLC, ContentWriting,
// Guide, Architecture), enter a direction for the steps, and — when existing
// steps are present — choose to append to them or override them.
//
// Used by:
// - BKThoughtDetailPage
// - BKThinkStudioAnon

import React, { useMemo, useState } from "react";
import { Button, toast } from "@heroui/react";
import {
  Sparkles,
  X,
  Loader2,
  GitMerge,
  RotateCcw,
  FileText,
  Layers,
  Braces,
} from "lucide-react";
import {
  BK_STEP_GENERATION_MODES,
  bkGetStepGenerationMode,
  type BKStepGenerationMode,
  type BKStepGenerationStrategy,
} from "./BKThoughtGeneration.Config";
import {
  generateStepsAction,
  type BKGeneratedStep,
} from "../think/BKThink.Actions";
import type { HelixAIOption } from "@/src/modules/helix";

// ─── Props ───────────────────────────────────────────────────────────────

export interface BKGenerateStepsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The thought being built — used as generation context */
  thoughtName: string;
  thoughtDescription: string;
  thoughtContent: string;
  /** Existing steps, passed so the AI stays coherent when appending */
  existingSteps?: Array<{ name: string; thought: string }>;
  /** AI config (provider + model) */
  aiConfig: HelixAIOption;
  /** Called with the generated steps and the chosen merge strategy */
  onGenerated: (
    steps: BKGeneratedStep[],
    strategy: BKStepGenerationStrategy,
  ) => void;
}

// ─── Mode icons ──────────────────────────────────────────────────────────

const MODE_ICONS: Record<BKStepGenerationMode, React.ReactNode> = {
  analytic: <FileText size={16} />,
  plan: <Layers size={16} />,
  sdlc: <Braces size={16} />,
  contentWriting: <FileText size={16} />,
  guide: <GitMerge size={16} />,
  architecture: <Layers size={16} />,
};

// ─── Component ──────────────────────────────────────────────────────────

export default function BKGenerateStepsModal({
  isOpen,
  onClose,
  thoughtName,
  thoughtDescription,
  thoughtContent,
  existingSteps,
  aiConfig,
  onGenerated,
}: BKGenerateStepsModalProps) {
  const [mode, setMode] = useState<BKStepGenerationMode>("analytic");
  const [request, setRequest] = useState("");
  const [strategy, setStrategy] = useState<BKStepGenerationStrategy>("append");
  const [useDescriptionAsDirection, setUseDescriptionAsDirection] =
    useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const hasExistingSteps = useMemo(
    () => !!existingSteps && existingSteps.length > 0,
    [existingSteps],
  );

  // Keep the default strategy aligned with whether existing steps are present.
  const resolvedStrategy: BKStepGenerationStrategy = hasExistingSteps
    ? strategy
    : "override";

  const activeMode = bkGetStepGenerationMode(mode);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    try {
      const result = await generateStepsAction({
        mode,
        strategy: resolvedStrategy,
        request,
        thoughtName,
        thoughtDescription,
        thoughtContent,
        existingSteps: hasExistingSteps ? existingSteps : undefined,
        useDescriptionAsDirection,
        aiConfig,
      });

      if (!result.success) {
        setError(result.error || "Failed to generate steps");
        toast.danger(result.error || "Failed to generate steps");
        return;
      }

      if (!result.steps || result.steps.length === 0) {
        setError("The AI returned no steps. Try a different direction.");
        toast.danger("The AI returned no steps. Try a different direction.");
        return;
      }

      onGenerated(result.steps, resolvedStrategy);
      toast.success(
        `${result.steps.length} step${result.steps.length > 1 ? "s" : ""} generated (${
          resolvedStrategy === "append" ? "appended" : "replaced"
        })`,
      );
      setRequest("");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Unknown generation error";
      setError(msg);
      toast.danger(msg);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-amber-500 flex items-center justify-center shrink-0">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Generate Steps with AI
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Produce train-of-thought steps for &ldquo;{thoughtName || "this thought"}&rdquo;
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body (scrollable) ──────────────────────────────────── */}
        <div className="px-5 py-4 space-y-5 overflow-y-auto">
          {/* Mode picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Production Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {BK_STEP_GENERATION_MODES.map((m) => {
                const isActive = m.id === mode;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      isActive
                        ? "border-purple-500 bg-purple-50 ring-2 ring-purple-100"
                        : "border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/40"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`${
                          isActive ? "text-purple-600" : "text-gray-400"
                        }`}
                      >
                        {MODE_ICONS[m.id]}
                      </span>
                      <span
                        className={`text-sm font-medium ${
                          isActive ? "text-purple-800" : "text-gray-700"
                        }`}
                      >
                        {m.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 leading-snug line-clamp-2">
                      {m.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Active mode detail */}
            <div className="mt-2 p-2.5 bg-purple-50 border border-purple-100 rounded-lg">
              <p className="text-[11px] text-purple-700 leading-relaxed">
                <strong>{activeMode.label}:</strong> {activeMode.description}
              </p>
            </div>
          </div>

          {/* Direction */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
              Direction <span className="text-gray-400 normal-case">(optional)</span>
            </label>
            <textarea
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              placeholder={`e.g. Break down the analysis of ${thoughtName || "this topic"} into logical steps`}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none resize-y"
            />

            {/* Toggle: use thought description as direction */}
            {thoughtDescription.trim() && (
              <button
                type="button"
                role="switch"
                aria-checked={useDescriptionAsDirection}
                onClick={() =>
                  setUseDescriptionAsDirection(!useDescriptionAsDirection)
                }
                className="mt-2 w-full flex items-center justify-between gap-3 p-2.5 rounded-lg border bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              >
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-gray-700">
                    Use thought description as direction
                  </span>
                  <span className="block text-[10px] text-gray-500 mt-0.5 truncate">
                    {useDescriptionAsDirection ? "The AI will use: " : "Ignored — "}
                    &ldquo;{thoughtDescription.trim()}&rdquo;
                  </span>
                </span>
                <span
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                    useDescriptionAsDirection ? "bg-purple-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                      useDescriptionAsDirection
                        ? "translate-x-[18px]"
                        : "translate-x-[3px]"
                    }`}
                  />
                </span>
              </button>
            )}
          </div>

          {/* Strategy — only when existing steps exist */}
          {hasExistingSteps && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                Existing steps found — how should generated steps be applied?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStrategy("append")}
                  className={`text-left p-3 rounded-xl border transition-all flex items-start gap-2 ${
                    strategy === "append"
                      ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100"
                      : "border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40"
                  }`}
                >
                  <GitMerge
                    size={16}
                    className={`mt-0.5 ${
                      strategy === "append" ? "text-emerald-600" : "text-gray-400"
                    }`}
                  />
                  <span>
                    <span
                      className={`block text-sm font-medium ${
                        strategy === "append"
                          ? "text-emerald-800"
                          : "text-gray-700"
                      }`}
                    >
                      Add to existing Steps
                    </span>
                    <span className="block text-[10px] text-gray-500 mt-0.5 leading-snug">
                      Keeps current steps and appends the generated ones after them.
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setStrategy("override")}
                  className={`text-left p-3 rounded-xl border transition-all flex items-start gap-2 ${
                    strategy === "override"
                      ? "border-amber-500 bg-amber-50 ring-2 ring-amber-100"
                      : "border-gray-200 bg-white hover:border-amber-300 hover:bg-amber-50/40"
                  }`}
                >
                  <RotateCcw
                    size={16}
                    className={`mt-0.5 ${
                      strategy === "override"
                        ? "text-amber-600"
                        : "text-gray-400"
                    }`}
                  />
                  <span>
                    <span
                      className={`block text-sm font-medium ${
                        strategy === "override"
                          ? "text-amber-800"
                          : "text-gray-700"
                      }`}
                    >
                      Override existing Steps
                    </span>
                    <span className="block text-[10px] text-gray-500 mt-0.5 leading-snug">
                      Replaces all current steps with the generated sequence.
                    </span>
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-2 px-5 pb-5 pt-2 border-t border-gray-100">
          <Button
            variant="ghost"
            size="sm"
            isDisabled={generating}
            onPress={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            isDisabled={generating}
            onPress={handleGenerate}
            className="px-5 py-2 bg-gradient-to-r from-purple-600 to-amber-500 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1.5 text-sm font-medium"
          >
            {generating ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={15} /> Generate Steps
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
