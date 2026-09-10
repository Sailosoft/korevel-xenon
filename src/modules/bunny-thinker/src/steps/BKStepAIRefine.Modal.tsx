"use client";

// BKStepAIRefine.Modal.tsx
//
// Single reusable modal that refines an existing train-of-thought sequence
// via Generative AI. The user provides a natural-language refinement
// instruction and the AI returns the full revised sequence — adding steps,
// updating step names/prompts, and removing steps as needed.
//
// All refinement logic lives in `useStepAIRefine` (BKStepAIRefine.ts).
//
// Used by:
// - BKThinkStudioAnon
// - BKThoughtDetailPage

import React from "react";
import { Button } from "@heroui/react";
import { WandSparkles, X, Loader2, ListChecks } from "lucide-react";
import {
  useStepAIRefine,
  type BKRefinedStep,
  type BKStepAIRefineStep,
} from "./BKStepAIRefine";
import type { HelixAIOption } from "@/src/modules/helix";

// ─── Props ───────────────────────────────────────────────────────────────

export interface BKStepAIRefineModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The current steps to refine. */
  steps: BKStepAIRefineStep[];
  /** Optional thought context to keep the refinement coherent. */
  thoughtName?: string;
  thoughtDescription?: string;
  thoughtContent?: string;
  /** AI config (provider + model) */
  aiConfig: HelixAIOption;
  /** Called with the full revised step sequence. */
  onRefined: (steps: BKRefinedStep[]) => void;
}

// ─── Component ──────────────────────────────────────────────────────────

export default function BKStepAIRefineModal({
  isOpen,
  onClose,
  steps,
  thoughtName,
  thoughtDescription,
  thoughtContent,
  aiConfig,
  onRefined,
}: BKStepAIRefineModalProps) {
  const {
    instruction,
    setInstruction,
    refining,
    error,
    canRefine,
    refine,
  } = useStepAIRefine({
    steps,
    thoughtName,
    thoughtDescription,
    thoughtContent,
    aiConfig,
    onRefined,
  });

  if (!isOpen) return null;

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
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center shrink-0">
              <WandSparkles size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Refine Steps with AI
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Refine the train of thought for &ldquo;{thoughtName || "this thought"}&rdquo;
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
          {/* Current steps preview */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Current steps ({steps.length})
            </label>
            {steps.length === 0 ? (
              <div className="p-3 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-xs text-gray-400 italic text-center">
                No steps to refine yet.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
                {steps.map((step, index) => (
                  <div
                    key={`${step.name}-${index}`}
                    className="flex items-start gap-2 px-3 py-2 bg-white"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-semibold text-indigo-600">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="block text-sm font-medium text-gray-800 truncate">
                        {step.name || "(untitled step)"}
                      </span>
                      {step.thought && (
                        <span className="block text-[11px] text-gray-400 truncate">
                          {step.thought}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Instruction */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
              Refinement Instruction <span className="text-red-500">*</span>
            </label>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder={`e.g. Add a validation step before the summary, rename step 2 to "Gather Evidence", and remove the redundant conclusion step.`}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none resize-y"
            />

            {/* Examples / guidance */}
            <div className="mt-2 p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg">
              <p className="text-[11px] text-indigo-700 leading-relaxed">
                <strong>Examples:</strong> &ldquo;Add a step for edge cases&rdquo;,
                &ldquo;Make step prompts more concise&rdquo;, &ldquo;Rename step 1&rdquo;,
                &ldquo;Remove the last step&rdquo;, &ldquo;Reorder to put testing before
                deployment&rdquo;.
              </p>
            </div>
          </div>

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
            isDisabled={refining}
            onPress={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            isDisabled={refining || !canRefine}
            onPress={refine}
            className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-sky-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-1.5 text-sm font-medium"
          >
            {refining ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Refining...
              </>
            ) : (
              <>
                <ListChecks size={15} /> Refine Steps
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
