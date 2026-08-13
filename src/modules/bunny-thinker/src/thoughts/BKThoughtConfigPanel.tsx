"use client";

// BKThoughtConfigPanel.tsx
//
// Reusable thought configuration panel used by both:
// - BKThinkStudioAnon (setup phase)
// - BKThoughtDetailPage
//
// Design and icons follow BKThinkStudioAnon's visual language.
// BKThinkStudioAnon adds extra sections (load thought, pattern/association,
// thinker selector) that are NOT part of this panel — those are rendered
// by the parent.

import React from "react";
import { Button, Select, ListBox } from "@heroui/react";
import { Brain, Sparkles, Plus, Trash2 } from "lucide-react";
import type { BKThoughtConfigPanelProps, BKConfigPanelStep } from "./BKThoughtConfigPanel.Types";
import type { BKCraftConfig, BKCraftFormat } from "../craft/BKCraft.Types";
import { BKCraftFormats, BKCraftFormatDescriptions } from "../craft/BKCraft.Types";

// ─── Helper: truncate description to first few words ────────────────────

function truncateDescription(text: string, maxWords = 12): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + "…";
}

// ─── Step Craft Detail (inline info block) ─────────────────────────────

function StepCraftDetail({ craftFormat }: { craftFormat?: string }) {
  if (!craftFormat) return null;

  const desc = BKCraftFormatDescriptions[craftFormat as BKCraftFormat];
  if (!desc) return null;

  return (
    <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
      <p className="text-xs text-amber-800 leading-relaxed line-clamp-3">
        {desc}
      </p>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────

export default function BKThoughtConfigPanel({
  thoughtName,
  onThoughtNameChange,
  thoughtDescription,
  onThoughtDescriptionChange,
  thoughtContent,
  onThoughtContentChange,
  steps,
  onAddStep,
  onRemoveStep,
  onUpdateStep,
  renderStepActions,
  renderStepsHeaderActions,
  renderStepsFooter,
  hideThoughtDefinition,
}: BKThoughtConfigPanelProps) {
  return (
    <div className="bk-thought-config-panel space-y-6">
      {/* ── Thought Definition ──────────────────────────────────────── */}
      {!hideThoughtDefinition && (
        <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Brain size={18} className="text-purple-600" />
            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
              Thought Definition
            </h3>
          </div>

          <div className="space-y-3">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Thought Name
              </label>
              <input
                type="text"
                value={thoughtName}
                onChange={(e) => onThoughtNameChange(e.target.value)}
                placeholder="e.g. The Nature of Consciousness"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Description <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={thoughtDescription}
                onChange={(e) => onThoughtDescriptionChange(e.target.value)}
                placeholder="Brief description of this thought"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none"
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Thought Content / System Prompt
              </label>
              <textarea
                value={thoughtContent}
                onChange={(e) => onThoughtContentChange(e.target.value)}
                placeholder="Write the main thought content or system prompt here..."
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none resize-y font-mono"
              />
            </div>
          </div>
        </section>
      )}

      {/* ── Steps Editor ────────────────────────────────────────────── */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-amber-600" />
            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
              Train of Thoughts (Steps)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {/* Optional header actions (e.g. Generative AI step producer) */}
            {renderStepsHeaderActions}
            <Button
              variant="ghost"
              size="sm"
              onPress={onAddStep}
              className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors flex items-center gap-1 text-xs"
            >
              <Plus size={14} /> Add Step
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50/50"
            >
              {/* Step header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Step {index + 1}
                </span>
                <div className="flex items-center gap-1">
                  {/* Optional extra actions (e.g. idea selector, move up/down) */}
                  {renderStepActions?.(step, index)}

                  {/* Remove step */}
                  <Button
                    variant="ghost"
                    size="sm"
                    isDisabled={steps.length <= 1}
                    onPress={() => onRemoveStep(index)}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    aria-label={`Remove step ${index + 1}`}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>

              {/* Step name */}
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">
                  Step Name
                </label>
                <input
                  type="text"
                  value={step.name}
                  onChange={(e) => onUpdateStep(index, "name", e.target.value)}
                  placeholder="e.g. Define the problem"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none"
                />
              </div>

              {/* Step prompt */}
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">
                  Step Prompt
                </label>
                <textarea
                  value={step.thought}
                  onChange={(e) =>
                    onUpdateStep(index, "thought", e.target.value)
                  }
                  placeholder="Write the prompt for this step..."
                  rows={3}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none resize-y font-mono"
                />
              </div>

              {/* Craft selector — uses BKCraftFormats directly */}
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">
                  Craft Output Format{" "}
                  <span className="text-gray-400">(optional)</span>
                </label>
                <Select
                  aria-label="Select craft format"
                  value={step.craftFormat ?? ""}
                  placeholder="No craft format"
                  onChange={(val: unknown) => {
                    const format = String(val);
                    onUpdateStep(index, "craftFormat", format);
                  }}
                  className="w-full"
                >
                  <Select.Trigger className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBox.Item key="" id="" textValue="No craft format">
                        <span className="text-sm text-gray-400">
                          No craft format
                        </span>
                      </ListBox.Item>
                      {BKCraftFormats.map((format) => {
                        const desc = BKCraftFormatDescriptions[format];
                        const shortDesc = desc
                          ? truncateDescription(desc)
                          : "";
                        return (
                          <ListBox.Item
                            key={format}
                            id={format}
                            textValue={format}
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-medium capitalize">
                                {format}
                              </span>
                              {shortDesc && (
                                <span className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
                                  {shortDesc}
                                </span>
                              )}
                            </div>
                          </ListBox.Item>
                        );
                      })}
                    </ListBox>
                  </Select.Popover>
                </Select>

                {/* Craft detail info */}
                <StepCraftDetail craftFormat={step.craftFormat} />
              </div>
            </div>
          ))}
        </div>

        {/* Optional footer content (e.g. save button) */}
        {renderStepsFooter}
      </section>
    </div>
  );
}
