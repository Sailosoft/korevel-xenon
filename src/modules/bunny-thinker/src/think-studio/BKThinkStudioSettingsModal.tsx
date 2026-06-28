/**
 * BKThinkStudioSettingsModal — Modal for configuring Think Studio settings.
 *
 * Provides:
 *  - Association Select: choose a thought association to override pattern
 *    memory slot values during the thinking process.
 *  - Thinker Select: choose a thinker persona to apply during thinking.
 */

"use client";

import React from "react";
import { X, Link2, Settings2, Brain } from "lucide-react";
import { Select, ListBox } from "@heroui/react";
import type { BKThoughtAssociation } from "../thought-association/BKThoughtAssociation.Types";
import type { BKThinker } from "../thinker/BKThinker.Types";

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
}: BKThinkStudioSettingsModalProps) {
  if (!isOpen) return null;

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
                The thinker's name, role, and description will be injected into
                the AI system prompt to shape its perspective.
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
          {/* ─── Section: Association Override ──────────────────── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Link2 size={18} className="text-blue-600" />
              <h4 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                Association Override
              </h4>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 space-y-3">
              <p className="text-xs text-blue-700 leading-relaxed">
                Select a thought association to override the pattern's
                default memory slot values. The association's slot values
                will be baked into the system context when running the thinking
                process.
              </p>

              {thoughtPatternId ? (
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
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
