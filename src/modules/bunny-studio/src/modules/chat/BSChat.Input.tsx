// BSChat.Input — Chat input with the three initial modes from the PLAN:
//  1. standard input chat
//  2. instruction field + text field
//  3. CodeMirror input field
//
// Also implements feature requests:
//  - Auto-growing textarea (no longer a fixed big box).
//  - Animated send/stop button while the AI is streaming.
//  - Per-request render type selector (resets after the request).
//  - Spinning red line around the initial chat input (feature).
//  - Code editor "open in modal" with cover/window view toggle (feature).
//  - Agent skill bubbles — click a skill to create a bubble in the message (feature).
//  - Custom Instructions — prefill the instruction from an InstructionGroup then
//    an Instruction (or any instruction when no group is selected) (feature).

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Send,
  Square,
  Type,
  SlidersHorizontal,
  Code2,
  Sparkles,
  ExternalLink,
  X,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { BSCodeMirrorEditor, BSModal } from "../../components";
import { bsDB } from "../../BSDatabase";
import type { BSInstructionGroup } from "../instruction-groups/BSInstructionGroup.Types";
import type { BSInstruction } from "../instructions/BSInstruction.Types";
import type { RenderFormat } from "@/src/modules/render";

// ─── Modes ─────────────────────────────────────────────────────────────

export type BSChatInputMode = "standard" | "instruction" | "codemirror";

export interface BSChatInputProps {
  /** Called when the user submits content (and optional instruction + skills) */
  onSend: (content: string, instruction?: string, skills?: string[]) => void;
  /** True while a stream is in progress — disables send, shows stop */
  isStreaming?: boolean;
  onStop?: () => void;
  /** Default input mode */
  defaultMode?: BSChatInputMode;
  /** Placeholder text */
  placeholder?: string;
  /** Current render type shown in the per-request selector */
  renderType?: RenderFormat;
  /** Available render types for the per-request selector */
  renderTypes?: readonly RenderFormat[];
  /** Called when the user changes the per-request render type */
  onRenderTypeChange?: (format: RenderFormat | undefined) => void;
  /** True only for the initial (empty) chat input — enables the spinning ring + skill bubbles */
  initial?: boolean;
  /** Agent skills offered as clickable bubbles (feature: Agent skill) */
  skillSuggestions?: string[];
}

const MODE_ICONS: Record<BSChatInputMode, React.ReactNode> = {
  standard: <Type className="w-4 h-4" />,
  instruction: <SlidersHorizontal className="w-4 h-4" />,
  codemirror: <Code2 className="w-4 h-4" />,
};

const MAX_TEXTAREA_HEIGHT = 200; // px

// ─── Component ─────────────────────────────────────────────────────────

export function BSChatInput({
  onSend,
  isStreaming = false,
  onStop,
  defaultMode = "standard",
  placeholder = "Message Bunny AI Studio…",
  renderType,
  renderTypes,
  onRenderTypeChange,
  initial = false,
  skillSuggestions = [],
}: BSChatInputProps) {
  const [mode, setMode] = useState<BSChatInputMode>(defaultMode);
  const [text, setText] = useState("");
  const [instruction, setInstruction] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Skill bubbles (feature: Agent skill)
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  // Code editor modal (feature: Code Editor Open Modal)
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [editorCoverView, setEditorCoverView] = useState(false);

  // Custom Instructions (feature): group filter + instruction prefill
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedInstructionId, setSelectedInstructionId] =
    useState<string>("");

  const instructionGroups = useLiveQuery<BSInstructionGroup[]>(
    () =>
      bsDB.instructionGroupsRepo.query
        .getAll({ page: 0, pageSize: 0 })
        .then((r) => r.data),
    [],
  );

  const allInstructions = useLiveQuery<BSInstruction[]>(
    () =>
      bsDB.instructionsRepo.query
        .getAll({ page: 0, pageSize: 0 })
        .then((r) => r.data),
    [],
  );

  const filteredInstructions = useMemo<BSInstruction[]>(() => {
    if (!allInstructions) return [];
    if (selectedGroupId) {
      return allInstructions.filter((i) => i.instructionGroupId === selectedGroupId);
    }
    return allInstructions;
  }, [allInstructions, selectedGroupId]);

  // Auto-grow the standard textarea so it is compact when empty and expands
  // as the user types (feature: "Textarea input is too big").
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [text, mode]);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill)
        ? prev.filter((s) => s !== skill)
        : [...prev, skill],
    );
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    const instructionValue =
      mode === "instruction" ? instruction.trim() || undefined : undefined;
    onSend(trimmed, instructionValue, selectedSkills);
    setText("");
    setInstruction("");
    setSelectedSkills([]);
    setSelectedGroupId("");
    setSelectedInstructionId("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInstructionSelect = (id: string) => {
    setSelectedInstructionId(id);
    const inst = filteredInstructions.find((i) => i.id === id);
    if (inst) setInstruction(inst.content);
  };

  const modeButtons: Array<{ mode: BSChatInputMode; label: string }> = [
    { mode: "standard", label: "Standard" },
    { mode: "instruction", label: "Instruction" },
    { mode: "codemirror", label: "Code" },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Skill bubbles (feature: Agent skill) — only on the initial chat */}
      {initial && skillSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {skillSuggestions.map((skill) => {
            const active = selectedSkills.includes(skill);
            return (
              <button
                key={skill}
                onClick={() => toggleSkill(skill)}
                title={
                  active
                    ? "Remove skill bubble"
                    : "Add skill as a bubble in the message"
                }
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] transition ${
                  active
                    ? "bg-red-600 text-white shadow-sm"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-600"
                }`}
              >
                {skill}
                {active && <X className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Input area (spinning red line around it only on the initial chat) */}
      <div className={initial ? "bs-spin-ring" : ""}>
        <div
          className={`bs-spin-ring-inner bg-white border rounded-3xl shadow-sm overflow-hidden transition-colors ${
            initial ? "rounded-[calc(1.75rem-2px)]" : ""
          } ${
            isStreaming
              ? "border-red-300 ring-2 ring-red-100"
              : "border-gray-200 focus-within:border-red-300"
          }`}
        >
          {mode === "instruction" && (
            <>
              {/* Instruction group + instruction prefill (feature) */}
              <div className="flex flex-col sm:flex-row gap-2 px-3 pt-2.5">
                <select
                  value={selectedGroupId}
                  onChange={(e) => {
                    setSelectedGroupId(e.target.value);
                    setSelectedInstructionId("");
                  }}
                  title="Instruction group"
                  className="px-2 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-[11px] text-gray-600 outline-none focus:border-red-300 flex-1"
                >
                  <option value="">All instruction groups</option>
                  {(instructionGroups ?? []).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedInstructionId}
                  onChange={(e) => handleInstructionSelect(e.target.value)}
                  title="Saved instruction (prefills below)"
                  className="px-2 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-[11px] text-gray-600 outline-none focus:border-red-300 flex-1"
                >
                  <option value="">Select instruction…</option>
                  {filteredInstructions.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.title}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Custom instruction…"
                className="w-full px-4 py-2.5 text-sm text-gray-600 border-b border-gray-100 outline-none resize-none placeholder:text-gray-400"
                rows={2}
              />
            </>
          )}

          {mode === "codemirror" ? (
            <div className="px-2 py-2">
              <BSCodeMirrorEditor
                value={text}
                onChange={setText}
                height={140}
                className="rounded-2xl"
              />
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={1}
              className="w-full px-4 py-3 text-sm text-gray-800 outline-none resize-none placeholder:text-gray-400 bg-transparent min-h-[48px]"
            />
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              {/* Mode selector — Standard / Instruction / Code moved to the
                  bottom of the input, next to the render selection and helper
                  text (feature: input toolbar at the bottom). */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                {modeButtons.map((b) => (
                  <button
                    key={b.mode}
                    onClick={() => setMode(b.mode)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition ${
                      mode === b.mode
                        ? "bg-white shadow text-red-600 font-medium"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {MODE_ICONS[b.mode]}
                    {b.label}
                  </button>
                ))}
              </div>

              {/* Per-request render type selector (feature) */}
              {renderTypes && renderTypes.length > 0 && (
                <select
                  value={renderType ?? ""}
                  onChange={(e) =>
                    onRenderTypeChange?.(
                      e.target.value
                        ? (e.target.value as RenderFormat)
                        : undefined,
                    )
                  }
                  disabled={isStreaming}
                  title="Render type for the next message"
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-[11px] text-gray-500 outline-none focus:border-red-300 disabled:opacity-50 max-w-[140px]"
                >
                  <option value="">No render</option>
                  {renderTypes.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              )}

              {/* Open the code editor in a modal (feature) */}
              {mode === "codemirror" && !isStreaming && (
                <button
                  onClick={() => {
                    setEditorCoverView(false);
                    setEditorModalOpen(true);
                  }}
                  title="Open code editor in a modal"
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-[11px] text-gray-500 hover:border-red-300 hover:text-red-600 transition"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open in Modal
                </button>
              )}

              <span className="text-[10px] text-gray-400 truncate">
                {isStreaming
                  ? "Generating…"
                  : "Enter to send · Shift+Enter for new line"}
              </span>
            </div>

            {isStreaming ? (
              <button
                onClick={onStop}
                className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl px-4 py-2 text-sm transition animate-pulse"
              >
                <Square className="w-3.5 h-3.5" />
                Stop
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!text.trim()}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2 text-sm transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <Send className="w-3.5 h-3.5" />
                Send
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Code editor modal with cover/window view toggle (feature) */}
      <BSModal
        open={editorModalOpen}
        onClose={() => setEditorModalOpen(false)}
        title="Code Editor"
        sizeClassName="max-w-3xl h-[80vh]"
        fullscreen={editorCoverView}
        onFullscreenChange={setEditorCoverView}
        footer={
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Editing in a separate window
            </span>
            <button
              onClick={() => setEditorCoverView((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition"
            >
              {editorCoverView ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" /> Window View
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" /> Cover View
                </>
              )}
            </button>
          </div>
        }
      >
        <div className="h-full">
          <BSCodeMirrorEditor
            value={text}
            onChange={setText}
            height="100%"
            className="rounded-none"
          />
        </div>
      </BSModal>
    </div>
  );
}

export default BSChatInput;
