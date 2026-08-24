/**
 * BKThinkStudioSettingsModal — Modal for configuring Think Studio settings.
 *
 * Provides:
 *  - Association Override: choose a saved thought association (pattern) to
 *    override pattern memory slot values, OR toggle ON a custom form to fill
 *    the pattern's slot fields manually. Custom overrides can be persisted
 *    as a new think pattern (association) or kept session-only.
 *  - Thinker Select: choose a thinker persona to apply during thinking.
 */

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  X,
  Link2,
  Settings2,
  Brain,
  RotateCcw,
  Save,
  Database,
  Clock,
} from "lucide-react";
import { Select, ListBox, Switch, Input, TextArea } from "@heroui/react";
import type {
  BKThoughtAssociation,
  BKAssociationSlotValue,
} from "../thought-association/BKThoughtAssociation.Types";
import type { BKThoughtPattern } from "../thought-pattern/BKThoughtPattern.Types";
import type { BKThinker } from "../thinker/BKThinker.Types";
import { bkThinkerDB } from "../database/BKThinkerDatabase";
import BunnyCodeEditor from "@/src/modules/bunny/src/form/builder/BunnyCodeEditor";
import BunnyMDXEditor from "@/src/modules/bunny/src/form/builder/BunnyMDXEditor";

// ─── Props ───────────────────────────────────────────────────────────────

export interface BKThinkStudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;

  // Association select state
  thoughtPatternId?: string;
  associations: BKThoughtAssociation[];
  selectedAssociationId?: string;
  selectedAssociation: BKThoughtAssociation | null;
  associationSelectLoading: boolean;
  onAssociationChange: (val: unknown) => void;

  // Thinker select state
  thinkers: BKThinker[];
  thinkersLoading: boolean;
  selectedThinkerId?: string;
  selectedThinker: BKThinker | null;
  onThinkerChange: (val: unknown) => void;

  // Last thought
  onClearLastThought?: () => void;

  // ── Custom override (form) state ────────────────────────────────────
  /** When true, the custom slot-value form is used instead of the select. */
  associationOverrideEnabled: boolean;
  onAssociationOverrideEnabledChange: (enabled: boolean) => void;
  /** "session" = current session only; "persistent" = save as think pattern. */
  associationOverridePersistence: "session" | "persistent";
  onAssociationOverridePersistenceChange: (
    mode: "session" | "persistent",
  ) => void;
  associationOverrideSlotValues: BKAssociationSlotValue[];
  onAssociationOverrideSlotValuesChange: (
    values: BKAssociationSlotValue[],
  ) => void;
  /** Persist the current custom slot values as a new think pattern. */
  onSavePersistentAssociation: (
    name: string,
    values: BKAssociationSlotValue[],
  ) => Promise<void>;
  associationSaving: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────

export default function BKThinkStudioSettingsModal({
  isOpen,
  onClose,
  thoughtPatternId,
  associations,
  selectedAssociationId,
  selectedAssociation,
  associationSelectLoading,
  onAssociationChange,
  thinkers,
  thinkersLoading,
  selectedThinkerId,
  selectedThinker,
  onThinkerChange,
  onClearLastThought,
  associationOverrideEnabled,
  onAssociationOverrideEnabledChange,
  associationOverridePersistence,
  onAssociationOverridePersistenceChange,
  associationOverrideSlotValues,
  onAssociationOverrideSlotValuesChange,
  onSavePersistentAssociation,
  associationSaving,
}: BKThinkStudioSettingsModalProps) {
  // ── Local state ─────────────────────────────────────────────────────
  const [pattern, setPattern] = useState<BKThoughtPattern | null>(null);
  const [patternLoading, setPatternLoading] = useState(false);
  const [persistName, setPersistName] = useState("");

  // Keep the latest slot values available to the pattern loader without
  // recreating the callback on every keystroke.
  const slotValuesRef = useRef(associationOverrideSlotValues);
  useEffect(() => {
    slotValuesRef.current = associationOverrideSlotValues;
  }, [associationOverrideSlotValues]);

  // Load the pattern for the linked thought so the custom form can render slots.
  // Seeds the override values from pattern defaults when there are no values
  // already matching the current pattern (e.g. switching patterns).
  const loadPattern = useCallback(
    async (patternId: string) => {
      setPatternLoading(true);
      try {
        const result = await bkThinkerDB.thoughtPatternsRepo.get(patternId);
        if (result.isSuccess) {
          setPattern(result.value);
          const hasMatching = slotValuesRef.current.some((sv) =>
            result.value.slots.some((s) => s.id === sv.slotId),
          );
          if (!hasMatching) {
            onAssociationOverrideSlotValuesChange(
              result.value.slots.map((slot) => ({
                slotId: slot.id,
                value: slot.defaultValue ?? "",
              })),
            );
          }
        } else {
          setPattern(null);
        }
      } catch (err) {
        console.error(
          "[BKThinkStudioSettingsModal] Failed to load pattern:",
          err,
        );
        setPattern(null);
      } finally {
        setPatternLoading(false);
      }
    },
    [onAssociationOverrideSlotValuesChange],
  );

  useEffect(() => {
    if (!thoughtPatternId) return;
    loadPattern(thoughtPatternId);
  }, [thoughtPatternId, loadPattern]);

  if (!isOpen) return null;

  const updateSlotValue = (slotId: string, value: string) => {
    const existing = associationOverrideSlotValues.findIndex(
      (sv) => sv.slotId === slotId,
    );
    if (existing >= 0) {
      const updated = [...associationOverrideSlotValues];
      updated[existing] = { ...updated[existing], value };
      onAssociationOverrideSlotValuesChange(updated);
    } else {
      onAssociationOverrideSlotValuesChange([
        ...associationOverrideSlotValues,
        { slotId, value },
      ]);
    }
  };

  const filledCount = associationOverrideSlotValues.filter(
    (sv) => sv.value && sv.value.trim().length > 0,
  ).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[85vh] mx-4 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            <Settings2 size={20} className="text-gray-700" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Think Studio Settings
              </h3>
              <p className="text-sm text-gray-500">
                Configure thought association overrides and session settings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Body ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* ─── Section: Thinker Persona ──────────────────────────── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Brain size={18} className="text-purple-600" />
              <h4 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                Thinker Persona
              </h4>
            </div>

            <div className="bg-purple-50 rounded-lg p-4 border border-purple-100 space-y-3">
              <p className="text-xs text-purple-700 leading-relaxed">
                Select a thinker persona to apply during the thinking process.
                The thinker&rsquo;s name, role, and description will be injected
                into the AI system prompt to shape its perspective.
              </p>

              <div className="space-y-2">
                <label className="text-xs text-purple-600 font-medium uppercase tracking-wider">
                  Thinker
                </label>
                <Select
                  aria-label="Select thinker"
                  value={selectedThinkerId ?? ""}
                  onChange={onThinkerChange}
                  placeholder={
                    thinkersLoading
                      ? "Loading..."
                      : thinkers.length === 0
                        ? "No thinkers"
                        : "No persona (default)"
                  }
                  isDisabled={thinkersLoading}
                  className="w-full"
                >
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    {thinkersLoading ? (
                      <ListBox key="loading">
                        <ListBox.Item
                          key="loading-item"
                          id="loading"
                          textValue="Loading thinkers..."
                          className="text-default-400 italic"
                        >
                          Loading thinkers...
                        </ListBox.Item>
                      </ListBox>
                    ) : thinkers.length === 0 ? (
                      <ListBox key="empty">
                        <ListBox.Item
                          key="empty-item"
                          id="empty"
                          textValue="No thinkers found"
                          className="text-default-400 italic"
                        >
                          No thinkers available — create one first
                        </ListBox.Item>
                      </ListBox>
                    ) : (
                      <ListBox key="ready">
                        {/* Option to clear selection (no persona) */}
                        <ListBox.Item
                          key=""
                          id=""
                          textValue="No persona (default)"
                        >
                          <span className="text-gray-400">
                            No persona (default)
                          </span>
                        </ListBox.Item>
                        {thinkers.map((t) => (
                          <ListBox.Item
                            key={t.id}
                            id={t.id}
                            textValue={t.name}
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {t.name}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">
                                  {t.role.replace(/([A-Z])/g, " $1").trim()}
                                </span>
                                {t.specialization && (
                                  <span className="text-xs text-gray-400 truncate max-w-[160px]">
                                    {t.specialization}
                                  </span>
                                )}
                              </div>
                            </div>
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    )}
                  </Select.Popover>
                </Select>

                {/* Active thinker badge */}
                {selectedThinker && (
                  <div className="flex items-center gap-1.5 text-xs text-purple-700 bg-purple-100/60 px-2.5 py-1.5 rounded-md">
                    <Brain size={12} className="shrink-0" />
                    <span>
                      <strong>{selectedThinker.name}</strong>
                      {selectedThinker.role && (
                        <span>
                          {" "}
                          —{" "}
                          {selectedThinker.role
                            .replace(/([A-Z])/g, " $1")
                            .trim()}
                        </span>
                      )}
                      {selectedThinker.description && (
                        <span className="block text-purple-500 font-normal mt-0.5 leading-relaxed">
                          {selectedThinker.description}
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ─── Section: Association Override ──────────────────── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Link2 size={18} className="text-blue-600" />
              <h4 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                Association Override
              </h4>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 space-y-3">
              {/* Toggle: select a pattern OR fill fields manually */}
              <div className="flex items-center justify-between gap-3 rounded-lg bg-white/70 border border-blue-100 p-3">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-blue-800">
                    Custom override form
                  </p>
                  <p className="text-xs text-blue-600 leading-relaxed">
                    Toggle ON to fill the pattern&rsquo;s memory slot fields
                    manually instead of picking a saved association. Think Studio
                    will use these values when the toggle is on.
                  </p>
                </div>
                <Switch
                  id="association-override-toggle"
                  isSelected={associationOverrideEnabled}
                  onChange={(v) =>
                    onAssociationOverrideEnabledChange(Boolean(v))
                  }
                >
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Content>
                </Switch>
              </div>

              {associationOverrideEnabled ? (
                /* ── Form mode ─────────────────────────────────── */
                <div className="space-y-4">
                  {/* Persistence selector */}
                  <div className="space-y-2">
                    <label className="text-xs text-blue-600 font-medium uppercase tracking-wider">
                      Persistence
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onAssociationOverridePersistenceChange("session")
                        }
                        className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors ${
                          associationOverridePersistence === "session"
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-blue-700 border-blue-200 hover:border-blue-400"
                        }`}
                      >
                        <span className="flex items-center gap-1.5 text-xs font-semibold">
                          <Clock size={13} />
                          Session only
                        </span>
                        <span
                          className={`text-[10px] leading-relaxed ${
                            associationOverridePersistence === "session"
                              ? "text-blue-100"
                              : "text-blue-500"
                          }`}
                        >
                          Non-persistent. Fields are available only during the
                          current session.
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onAssociationOverridePersistenceChange("persistent")
                        }
                        className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors ${
                          associationOverridePersistence === "persistent"
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-blue-700 border-blue-200 hover:border-blue-400"
                        }`}
                      >
                        <span className="flex items-center gap-1.5 text-xs font-semibold">
                          <Database size={13} />
                          Persistent
                        </span>
                        <span
                          className={`text-[10px] leading-relaxed ${
                            associationOverridePersistence === "persistent"
                              ? "text-blue-100"
                              : "text-blue-500"
                          }`}
                        >
                          Available in this session and saved as a think pattern.
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Slot fields */}
                  {!thoughtPatternId ? (
                    <p className="text-xs text-blue-400 italic">
                      No thought pattern is linked to the current thought. Load a
                      thought with a pattern to fill its memory slot fields.
                    </p>
                  ) : patternLoading ? (
                    <p className="text-xs text-blue-400 italic">
                      Loading pattern slots...
                    </p>
                  ) : !pattern ? (
                    <p className="text-xs text-blue-400 italic">
                      Pattern could not be loaded.
                    </p>
                  ) : pattern.slots.length === 0 ? (
                    <p className="text-xs text-blue-400 italic">
                      This pattern defines no memory slots.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-blue-600 leading-relaxed">
                        Fill values for each slot defined by the
                        &ldquo;{pattern.name}&rdquo; pattern. These will be used
                        by Think Studio while the override is active.
                      </p>
                      {pattern.slots.map((slot) => {
                        const slotVal = associationOverrideSlotValues.find(
                          (sv) => sv.slotId === slot.id,
                        );
                        const value = slotVal?.value ?? "";
                        return (
                          <div key={slot.id} className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">
                              {slot.label || slot.name}
                              {slot.required && (
                                <span className="text-red-500 ml-0.5">*</span>
                              )}
                              <span className="text-xs text-gray-400 ml-2">
                                ({slot.type})
                              </span>
                            </label>
                            {slot.type === "text" ? (
                              <Input
                                placeholder={`Enter ${slot.name}`}
                                value={value}
                                onChange={(e) =>
                                  updateSlotValue(slot.id, e.target.value)
                                }
                                className="w-full bg-white"
                              />
                            ) : slot.type === "textarea" ? (
                              <TextArea
                                placeholder={`Enter ${slot.name}`}
                                value={value}
                                onChange={(e) =>
                                  updateSlotValue(slot.id, e.target.value)
                                }
                                className="w-full min-h-[80px] bg-white"
                              />
                            ) : slot.type === "code-editor" ? (
                              <BunnyCodeEditor
                                id={`slot-value-${slot.id}`}
                                value={value}
                                onChange={(val) =>
                                  updateSlotValue(slot.id, val)
                                }
                                placeholder={`Enter ${slot.name}`}
                                language="typescript"
                                minHeight={80}
                              />
                            ) : (
                              <BunnyMDXEditor
                                id={`slot-value-${slot.id}`}
                                value={value}
                                onChange={(val) =>
                                  updateSlotValue(slot.id, val)
                                }
                                placeholder={`Enter ${slot.name}`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Active override badge */}
                  <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-100/60 px-2.5 py-1.5 rounded-md">
                    <Link2 size={12} className="shrink-0" />
                    <span>
                      <strong>{filledCount}</strong> field
                      {filledCount !== 1 ? "s" : ""} filled — will override the
                      pattern defaults
                      {associationOverridePersistence === "persistent"
                        ? " and save as a think pattern"
                        : " for this session only"}
                    </span>
                  </div>

                  {/* Persistent save */}
                  {associationOverridePersistence === "persistent" &&
                    thoughtPatternId &&
                    pattern &&
                    pattern.slots.length > 0 && (
                      <div className="space-y-2 border-t border-blue-200 pt-3">
                        <label className="text-xs text-blue-600 font-medium uppercase tracking-wider">
                          Save as Think Pattern
                        </label>
                        <Input
                          placeholder="Pattern name (e.g. Marketing Strategy)"
                          value={persistName}
                          onChange={(e) => setPersistName(e.target.value)}
                          className="w-full bg-white"
                        />
                        <button
                          onClick={() =>
                            onSavePersistentAssociation(
                              persistName.trim(),
                              associationOverrideSlotValues,
                            )
                          }
                          disabled={
                            !persistName.trim() || associationSaving
                          }
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5 text-sm font-medium"
                        >
                          <Save size={14} />
                          {associationSaving
                            ? "Saving..."
                            : "Save Think Pattern"}
                        </button>
                      </div>
                    )}
                </div>
              ) : (
                /* ── Select mode (default) ─────────────────────── */
                thoughtPatternId ? (
                  <div className="space-y-2">
                    <label className="text-xs text-blue-600 font-medium uppercase tracking-wider">
                      Association
                    </label>
                    <Select
                      aria-label="Select association"
                      value={selectedAssociationId ?? ""}
                      onChange={onAssociationChange}
                      placeholder={
                        associationSelectLoading
                          ? "Loading..."
                          : associations.length === 0
                            ? "No associations"
                            : "Pattern defaults"
                      }
                      isDisabled={associationSelectLoading}
                      className="w-full"
                    >
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        {associationSelectLoading ? (
                          <ListBox key="loading">
                            <ListBox.Item
                              key="loading-item"
                              id="loading"
                              textValue="Loading associations..."
                              className="text-default-400 italic"
                            >
                              Loading associations...
                            </ListBox.Item>
                          </ListBox>
                        ) : associations.length === 0 ? (
                          <ListBox key="empty">
                            <ListBox.Item
                              key="empty-item"
                              id="empty"
                              textValue="No associations found"
                              className="text-default-400 italic"
                            >
                              No associations for this pattern
                            </ListBox.Item>
                          </ListBox>
                        ) : (
                          <ListBox key="ready">
                            {/* Option to clear selection (use pattern defaults) */}
                            <ListBox.Item
                              key=""
                              id=""
                              textValue="Pattern defaults (no override)"
                            >
                              <span className="text-gray-400">
                                Pattern defaults
                              </span>
                            </ListBox.Item>
                            {associations.map((assoc) => (
                              <ListBox.Item
                                key={assoc.id}
                                id={assoc.id}
                                textValue={assoc.name}
                              >
                                <div className="flex flex-col">
                                  <span className="text-sm">{assoc.name}</span>
                                  {assoc.description && (
                                    <span className="text-xs text-gray-400 truncate max-w-[240px]">
                                      {assoc.description}
                                    </span>
                                  )}
                                </div>
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        )}
                      </Select.Popover>
                    </Select>

                    {/* Active override badge */}
                    {selectedAssociation && (
                      <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-100/60 px-2.5 py-1.5 rounded-md">
                        <Link2 size={12} className="shrink-0" />
                        <span>
                          <strong>{selectedAssociation.name}</strong> —{" "}
                          {selectedAssociation.slotValues.length} slot value
                          {selectedAssociation.slotValues.length !== 1
                            ? "s"
                            : ""}{" "}
                          will override the pattern defaults
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-blue-400 italic">
                    No thought pattern is linked to the current thought. Load a
                    thought with a pattern to configure association overrides.
                  </p>
                )
              )}
            </div>
          </section>

          {/* ─── Section: Last Thought ──────────────────────────── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <RotateCcw size={18} className="text-orange-600" />
              <h4 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                Last Thought
              </h4>
            </div>

            <div className="bg-orange-50 rounded-lg p-4 border border-orange-100 space-y-3">
              <p className="text-xs text-orange-700 leading-relaxed">
                Clear the stored last thought reference. When you visit a
                thought&rsquo;s detail page, you will no longer be
                automatically redirected to the last think studio session.
              </p>

              <button
                onClick={onClearLastThought}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-1.5 text-sm font-medium"
              >
                <RotateCcw size={14} />
                Clear Last Thought
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
