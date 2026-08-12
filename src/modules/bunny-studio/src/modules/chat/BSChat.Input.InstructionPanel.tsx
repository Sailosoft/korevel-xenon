// BSChat.Input.InstructionPanel — Presentational custom instruction panel.
//
// Rendered in "instruction" mode: an instruction-group filter + a saved
// instruction selector that prefills the custom instruction textarea
// (feature: Custom Instructions).

"use client";

import React from "react";
import { Maximize2 } from "lucide-react";
import type { BSInstructionGroup } from "../instruction-groups/BSInstructionGroup.Types";
import type { BSInstruction } from "../instructions/BSInstruction.Types";

// ─── Props ─────────────────────────────────────────────────────────────

export interface BSChatInputInstructionPanelProps {
  /** Current custom instruction text */
  instruction: string;
  /** Updates the custom instruction text */
  onInstructionChange: (value: string) => void;
  /** All available instruction groups */
  groups: BSInstructionGroup[] | undefined;
  /** Currently selected group id ("" = all groups) */
  selectedGroupId: string;
  /** Called when the group filter changes (resets the instruction) */
  onGroupChange: (value: string) => void;
  /** Instructions filtered by the selected group */
  instructions: BSInstruction[];
  /** Currently selected saved instruction id */
  selectedInstructionId: string;
  /** Called when a saved instruction is picked (prefills the textarea) */
  onInstructionSelect: (id: string) => void;
  /** Ref to the instruction textarea (drives auto-grow) */
  instructionRef: React.RefObject<HTMLTextAreaElement | null>;
  /** Opens the instruction in a larger editor modal (feature: long instruction text) */
  onExpand: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────

export function BSChatInputInstructionPanel({
  instruction,
  onInstructionChange,
  groups,
  selectedGroupId,
  onGroupChange,
  instructions,
  selectedInstructionId,
  onInstructionSelect,
  instructionRef,
  onExpand,
}: BSChatInputInstructionPanelProps) {
  return (
    <>
      {/* Instruction group + instruction prefill (feature) */}
      <div className="flex flex-col sm:flex-row gap-2 px-3 pt-2.5">
        <select
          value={selectedGroupId}
          onChange={(e) => onGroupChange(e.target.value)}
          title="Instruction group"
          className="px-2 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-[11px] text-gray-600 outline-none focus:border-red-300 flex-1"
        >
          <option value="">All instruction groups</option>
          {(groups ?? []).map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <select
          value={selectedInstructionId}
          onChange={(e) => onInstructionSelect(e.target.value)}
          title="Saved instruction (prefills below)"
          className="px-2 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-[11px] text-gray-600 outline-none focus:border-red-300 flex-1"
        >
          <option value="">Select instruction…</option>
          {instructions.map((i) => (
            <option key={i.id} value={i.id}>
              {i.title}
            </option>
          ))}
        </select>
      </div>
      <div className="relative">
        <textarea
          ref={instructionRef}
          value={instruction}
          onChange={(e) => onInstructionChange(e.target.value)}
          placeholder="Custom instruction…"
          rows={1}
          className="w-full px-4 py-2.5 pr-10 text-sm text-gray-600 border-b border-gray-100 outline-none resize-none placeholder:text-gray-400"
        />
        <button
          type="button"
          onClick={onExpand}
          title="Open instruction in a larger editor"
          aria-label="Open instruction in a larger editor"
          className="absolute right-2 top-2 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-gray-100 transition"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </>
  );
}

export default BSChatInputInstructionPanel;
