/**
 * BKThinkMetaModal — Displays metadata for the current Think session.
 *
 * Shows:
 *  - AI provider + model (from the global BKAISettings)
 *  - Thought pattern and association (resolved slot values)
 *  - The thought's main prompt
 *  - Ideas connected to each train-of-thought step
 */

"use client";

import React, { useEffect, useState } from "react";
import { X, Brain, GitBranch, Link2, Lightbulb, Cpu, FileText, ChevronDown, ChevronRight, Palette } from "lucide-react";
import type { HelixAIOption } from "@/src/modules/helix";
import { HELIX_PROVIDER_LABELS } from "@/src/modules/helix";
import { bkThinkerDB } from "../database/BKThinkerDatabase";
import type { BKThought } from "../thoughts/BKThoughts.Types";
import type { BKThink } from "../think/BKThink.Types";
import type { BKTrainOfThought } from "../thoughts/BKThoughts.Types";
import type { BKThoughtPattern } from "../thought-pattern/BKThoughtPattern.Types";
import type { BKThoughtAssociation } from "../thought-association/BKThoughtAssociation.Types";
import type { BKIdea } from "../ideas/BKIdeas.Types";
import type { BKCraftConfig } from "../craft/BKCraft.Types";

// ─── Resolved data shape ─────────────────────────────────────────────────

interface BKThinkMetaData {
  // AI Config
  aiProvider: string;
  aiModel: string;

  // Thought
  thoughtName: string;
  thoughtPrompt: string;

  // Pattern
  pattern: BKThoughtPattern | null;
  association: BKThoughtAssociation | null;

  // Steps: title, prompt, craft mode
  steps: Array<{
    stepId: string;
    stepName: string;
    stepThought: string;
    craftFormat: string | null;
  }>;

  // Ideas per train-of-thought step
  stepIdeas: Array<{
    stepId: string;
    stepName: string;
    ideas: BKIdea[];
  }>;
}

// ─── Props ───────────────────────────────────────────────────────────────

export interface BKThinkMetaModalProps {
  think: BKThink;
  thought: BKThought;
  trainOfThoughts: BKTrainOfThought[];
  aiConfig: HelixAIOption;
  /** Active association selected in the Think Studio dropdown (overrides saved thoughtAssociationId) */
  activeAssociation?: BKThoughtAssociation | null;
  onClose: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────

export default function BKThinkMetaModal({
  think,
  thought,
  trainOfThoughts,
  aiConfig,
  activeAssociation,
  onClose,
}: BKThinkMetaModalProps) {
  const [metaData, setMetaData] = useState<BKThinkMetaData | null>(null);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    bkLoadMetaData();
  }, []);

  const bkLoadMetaData = async () => {
    setLoading(true);
    setError("");

    try {
      // 1. Resolve pattern + association
      let pattern: BKThoughtPattern | null = null;
      let association: BKThoughtAssociation | null = null;

      // Priority: activeAssociation (from dropdown) > think.thoughtAssociationId > thought.patternId (defaults)
      if (activeAssociation) {
        // Use the actively selected association from the Think Studio dropdown
        association = activeAssociation;
        const patternResult = await bkThinkerDB.thoughtPatternsRepo.get(
          activeAssociation.patternId,
        );
        if (patternResult.isSuccess) {
          pattern = patternResult.value;
        }
      } else if (think.thoughtAssociationId) {
        const assocResult = await bkThinkerDB.thoughtAssociationsRepo.get(
          think.thoughtAssociationId,
        );
        if (assocResult.isSuccess) {
          association = assocResult.value;
          const patternResult = await bkThinkerDB.thoughtPatternsRepo.get(
            association.patternId,
          );
          if (patternResult.isSuccess) {
            pattern = patternResult.value;
          }
        }
      } else if (thought.patternId) {
        const patternResult = await bkThinkerDB.thoughtPatternsRepo.get(
          thought.patternId,
        );
        if (patternResult.isSuccess) {
          pattern = patternResult.value;
        }
      }

      // 2. Load craft configs to resolve format names for each step
      const allCraftConfigs = await bkThinkerDB.craftConfigs
        .toArray() as BKCraftConfig[];
      const craftConfigMap = new Map(
        allCraftConfigs.map((c) => [c.id, c.format]),
      );

      // 3. Build step metadata (title, prompt, craft mode)
      const steps: BKThinkMetaData["steps"] = trainOfThoughts.map((s) => ({
        stepId: s.id,
        stepName: s.name,
        stepThought: s.thought,
        craftFormat: s.craftId
          ? (craftConfigMap.get(s.craftId) ?? null)
          : null,
      }));

      // 4. Load ideas linked to each train-of-thought step
      const allMappings = await bkThinkerDB.trainOfThoughtIdeas
        .toArray() as Array<{ id: string; ideaId: string; trainOfThoughtId: string }>;

      const stepIdeas: BKThinkMetaData["stepIdeas"] = [];

      for (const step of trainOfThoughts) {
        const stepMappings = allMappings.filter(
          (m) => m.trainOfThoughtId === step.id,
        );
        const ideas: BKIdea[] = [];

        for (const mapping of stepMappings) {
          const ideaResult = await bkThinkerDB.ideasRepo.get(mapping.ideaId);
          if (ideaResult.isSuccess) {
            ideas.push(ideaResult.value);
          }
        }

        stepIdeas.push({
          stepId: step.id,
          stepName: step.name,
          ideas,
        });
      }

      // 5. Build the resolved provider label
      const providerLabel =
        HELIX_PROVIDER_LABELS[aiConfig.provider as keyof typeof HELIX_PROVIDER_LABELS] ??
        aiConfig.provider;

      setMetaData({
        aiProvider: providerLabel,
        aiModel: aiConfig.model,
        thoughtName: thought.name,
        thoughtPrompt: thought.thought,
        pattern,
        association,
        steps,
        stepIdeas,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load metadata",
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Slot value resolver helper ──────────────────────────────────────

  const resolveSlotValue = (slotId: string): string => {
    if (!metaData?.association) return "";
    const slotVal = metaData.association.slotValues.find(
      (sv) => sv.slotId === slotId,
    );
    return slotVal?.value ?? "";
  };

  const totalIdeasAttached = metaData?.stepIdeas.reduce(
    (sum, s) => sum + s.ideas.length,
    0,
  ) ?? 0;

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[85vh] mx-4 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Think Metadata
            </h3>
            <p className="text-sm text-gray-500">
              Session configuration, context, and connected data
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Body ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-sm text-gray-500">
                Loading metadata...
              </span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {metaData && !loading && (
            <>
              {/* ─── Section: AI Configuration ───────────────── */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Cpu size={18} className="text-purple-600" />
                  <h4 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                    AI Configuration
                  </h4>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 space-y-2 border border-purple-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-purple-800 font-medium">
                      Provider
                    </span>
                    <span className="text-sm text-purple-900 font-semibold">
                      {metaData.aiProvider}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-purple-800 font-medium">
                      Model
                    </span>
                    <span className="text-sm text-purple-900 font-mono font-semibold">
                      {metaData.aiModel}
                    </span>
                  </div>
                </div>
              </section>

              {/* ─── Section: Thought Pattern & Association ──── */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <GitBranch size={18} className="text-blue-600" />
                  <h4 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                    Pattern & Association
                  </h4>
                </div>

                {metaData.pattern ? (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 space-y-3">
                    <div>
                      <span className="text-xs text-blue-600 font-medium uppercase tracking-wider">
                        Pattern
                      </span>
                      <p className="text-sm font-semibold text-blue-900 mt-0.5">
                        {metaData.pattern.name}
                      </p>
                      {metaData.pattern.description && (
                        <p className="text-xs text-blue-700 mt-0.5">
                          {metaData.pattern.description}
                        </p>
                      )}
                    </div>

                    {/* Pattern slots */}
                    {metaData.pattern.slots.length > 0 && (
                      <div className="border-t border-blue-200 pt-2">
                        <span className="text-xs text-blue-600 font-medium uppercase tracking-wider">
                          Slot Values
                        </span>
                        <div className="mt-1.5 space-y-1.5">
                          {metaData.pattern.slots.map((slot) => {
                            const value = resolveSlotValue(slot.id) || slot.defaultValue || "";
                            return (
                              <div
                                key={slot.id}
                                className="flex items-start gap-2 text-sm"
                              >
                                <span className="text-blue-700 font-medium shrink-0 min-w-[100px]">
                                  {slot.label || slot.name}:
                                </span>
                                <span className={`${value ? "text-blue-900" : "text-blue-400 italic"}`}>
                                  {value || "(not set)"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Association info */}
                    {metaData.association && (
                      <div className="border-t border-blue-200 pt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-blue-600 font-medium uppercase tracking-wider">
                            Association
                          </span>
                          {activeAssociation && (
                            <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full font-medium">
                              Active Override
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-blue-900 mt-0.5">
                          {metaData.association.name}
                        </p>
                        {metaData.association.description && (
                          <p className="text-xs text-blue-700 mt-0.5">
                            {metaData.association.description}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-500 italic">
                      No pattern or association linked to this think session.
                    </p>
                  </div>
                )}
              </section>

              {/* ─── Section: Thought Main Prompt ─────────────── */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Brain size={18} className="text-amber-600" />
                  <h4 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                    Thought Prompt
                  </h4>
                </div>
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-amber-900">
                      {metaData.thoughtName}
                    </span>
                  </div>
                  <pre className="text-sm text-amber-800 whitespace-pre-wrap font-sans leading-relaxed max-h-40 overflow-y-auto">
                    {metaData.thoughtPrompt}
                  </pre>
                </div>
              </section>

              {/* ─── Section: Chain of Thought Steps (Accordion) ── */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <GitBranch size={18} className="text-indigo-600" />
                  <h4 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                    Chain of Thought Steps
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      ({metaData.steps.length} step{metaData.steps.length !== 1 ? "s" : ""})
                    </span>
                  </h4>
                </div>

                {metaData.steps.length === 0 ? (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-500 italic">
                      No steps defined for this thought.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {metaData.steps.map((step, index) => {
                      const isOpen = expandedStepId === step.stepId;
                      return (
                        <div
                          key={step.stepId}
                          className="bg-indigo-50 rounded-lg border border-indigo-100 overflow-hidden"
                        >
                          {/* Accordion Trigger */}
                          <button
                            onClick={() =>
                              setExpandedStepId(isOpen ? null : step.stepId)
                            }
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-indigo-100/50 transition-colors text-left"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-semibold text-indigo-400 w-6 shrink-0">
                                #{index + 1}
                              </span>
                              <span className="text-sm font-medium text-indigo-900 truncate">
                                {step.stepName || `Step ${index + 1}`}
                              </span>
                              {step.craftFormat && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                                  <Palette size={10} />
                                  {step.craftFormat}
                                </span>
                              )}
                            </div>
                            {isOpen ? (
                              <ChevronDown size={16} className="text-indigo-400 shrink-0" />
                            ) : (
                              <ChevronRight size={16} className="text-indigo-400 shrink-0" />
                            )}
                          </button>

                          {/* Accordion Content */}
                          {isOpen && (
                            <div className="px-4 pb-4 border-t border-indigo-100">
                              {/* Step Prompt */}
                              <div className="mt-3">
                                <span className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider">
                                  Prompt
                                </span>
                                <pre className="mt-1 text-sm text-indigo-800 whitespace-pre-wrap font-sans leading-relaxed bg-white rounded-md p-3 border border-indigo-100 max-h-32 overflow-y-auto">
                                  {step.stepThought || "(empty)"}
                                </pre>
                              </div>

                              {/* Craft Mode */}
                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider">
                                  Craft Mode:
                                </span>
                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${step.craftFormat ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-400"}`}>
                                  {step.craftFormat || "None"}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* ─── Section: Connected Ideas ─────────────────── */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb size={18} className="text-emerald-600" />
                  <h4 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                    Connected Ideas
                    {totalIdeasAttached > 0 && (
                      <span className="ml-2 text-xs font-normal text-gray-500">
                        ({totalIdeasAttached} total)
                      </span>
                    )}
                  </h4>
                </div>

                {metaData.stepIdeas.length === 0 ? (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-500 italic">
                      No ideas connected to any train-of-thought step.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {metaData.stepIdeas.map((step) => (
                      <div
                        key={step.stepId}
                        className="bg-emerald-50 rounded-lg p-4 border border-emerald-100"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <FileText size={14} className="text-emerald-600" />
                          <span className="text-sm font-medium text-emerald-900">
                            {step.stepName || `Step`}
                          </span>
                          <span className="text-xs text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                            {step.ideas.length} idea{step.ideas.length !== 1 ? "s" : ""}
                          </span>
                        </div>

                        {step.ideas.length === 0 ? (
                          <p className="text-xs text-emerald-500 italic ml-6">
                            No ideas attached
                          </p>
                        ) : (
                          <div className="ml-6 space-y-2">
                            {step.ideas.map((idea) => (
                              <div
                                key={idea.id}
                                className="bg-white rounded-md p-2.5 border border-emerald-200"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-emerald-800">
                                    {idea.name}
                                  </span>
                                  {idea.tags && (
                                    <span className="text-xs text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded">
                                      {idea.tags}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-emerald-700 mt-1 line-clamp-2">
                                  {idea.idea}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
