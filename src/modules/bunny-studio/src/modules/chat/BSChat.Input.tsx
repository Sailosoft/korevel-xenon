// BSChat.Input — Chat input with the three initial modes from the PLAN:
//  1. standard input chat
//  2. instruction field + text field
//  3. CodeMirror input field
//
// This file is a thin UI orchestrator. All state + logic lives in the
// `useBSChatInput` hook (BSChat.Input.Hooks.ts) and the UI is decomposed
// into presentational sub-components:
//  - BSChatInputSkillBubbles     — agent skill bubble row (feature: Agent skill).
//  - BSChatInputInstructionPanel — group + instruction prefill (feature: Custom
//    Instructions).
//  - BSChatInputToolbar          — mode selector + render type + open in modal.
//  - BSChatInputEditorModal      — CodeMirror "open in modal" with cover/window
//    view toggle (feature: Code Editor Open Modal).

"use client";

import React, { useEffect } from "react";
import { Send, Square, Sparkles } from "lucide-react";
import { BSCodeMirrorEditor } from "../../components";
import type { RenderFormat } from "@/src/modules/render";
import {
  MAX_TEXTAREA_HEIGHT,
  useBSChatInput,
  type BSChatInputMode,
  type BSChatInputSendHandler,
} from "./BSChat.Input.Hooks";
import { useBSSpeechRecognition } from "./BSChat.Input.STT.Hooks";
import { BSChatInputSTTButton } from "./BSChat.Input.STTButton";
import { BSChatInputSkillBubbles } from "./BSChat.Input.SkillBubbles";
import { BSChatInputInstructionPanel } from "./BSChat.Input.InstructionPanel";
import { BSChatInputToolbar } from "./BSChat.Input.Toolbar";
import { BSChatInputEditorModal } from "./BSChat.Input.EditorModal";
import { useBSAISettings } from "../ai-settings/BSAISettings.Context";

// ─── Modes ─────────────────────────────────────────────────────────────

export type { BSChatInputMode } from "./BSChat.Input.Hooks";

export interface BSChatInputProps {
  /** Called when the user submits content (and optional instruction + skills) */
  onSend: BSChatInputSendHandler;
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
  const {
    mode,
    setMode,
    text,
    setText,
    appendText,
    instruction,
    setInstruction,
    textareaRef,
    canSend,
    handleSend,
    handleKeyDown,
    selectedSkills,
    toggleSkill,
    editorModalOpen,
    editorCoverView,
    openEditorModal,
    closeEditorModal,
    toggleEditorCoverView,
    selectedGroupId,
    handleGroupChange,
    selectedInstructionId,
    instructionGroups,
    filteredInstructions,
    handleInstructionSelect,
    instructionRef,
    instructionCoverView,
    instructionModalOpen,
    openInstructionModal,
    closeInstructionModal,
    toggleInstructionCoverView,
  } = useBSChatInput({ onSend, isStreaming, defaultMode });

  // Speech-to-text settings from the global AI settings (browser vs AI engine,
  // provider/model/language/endpoint). The recognition logic lives in a
  // separate hook (BSChat.Input.STT.Hooks.ts); the live draft is shown in the
  // input and appended to the text on stop (or silence auto-stop).
  const { speech } = useBSAISettings();
  const stt = useBSSpeechRecognition({
    mode: speech.sttMode,
    ai: {
      provider: speech.sttProvider,
      model: speech.sttModel,
      language: speech.sttLanguage,
      endpoint: speech.sttEndpoint,
    },
    onFinalTranscript: appendText,
  });

  // Live draft = committed text + the in-progress speech transcript. The
  // draft is only displayed (not committed) until the session ends.
  const liveDraft = stt.listening ? stt.transcript : "";
  const displayText = liveDraft
    ? text
      ? `${text.trimEnd()} ${liveDraft}`
      : liveDraft
    : text;

  // Keep the standard textarea growing while a live speech draft is shown
  // (the base hook only re-grows on `text` changes).
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [displayText, mode, textareaRef]);

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Skill bubbles (feature: Agent skill) — only on the initial chat */}
      {initial && skillSuggestions.length > 0 && (
        <BSChatInputSkillBubbles
          skills={skillSuggestions}
          selectedSkills={selectedSkills}
          onToggle={toggleSkill}
        />
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
          {/* Instruction group + instruction prefill (feature) */}
          {mode === "instruction" && (
            <BSChatInputInstructionPanel
              instruction={instruction}
              onInstructionChange={setInstruction}
              groups={instructionGroups}
              selectedGroupId={selectedGroupId}
              onGroupChange={handleGroupChange}
              instructions={filteredInstructions}
              selectedInstructionId={selectedInstructionId}
              onInstructionSelect={handleInstructionSelect}
              instructionRef={instructionRef}
              onExpand={openInstructionModal}
            />
          )}

          {mode === "codemirror" ? (
            <div className="px-2 py-2">
              <BSCodeMirrorEditor
                value={displayText}
                onChange={(value) => {
                  setText(value);
                  // Manual typing mid-dictation — stop so the draft is not
                  // re-committed on top of what the user typed.
                  if (stt.listening) stt.abort();
                }}
                height={140}
                className="rounded-2xl"
              />
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={displayText}
              onChange={(e) => {
                setText(e.target.value);
                // Manual typing mid-dictation — stop so the draft is not
                // re-committed on top of what the user typed.
                if (stt.listening) stt.abort();
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={1}
              className="w-full px-4 py-3 text-sm text-gray-800 outline-none resize-none placeholder:text-gray-400 bg-transparent min-h-[48px]"
            />
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <BSChatInputToolbar
              mode={mode}
              onModeChange={setMode}
              renderType={renderType}
              renderTypes={renderTypes}
              onRenderTypeChange={onRenderTypeChange}
              isStreaming={isStreaming}
              onOpenEditorModal={openEditorModal}
            />

            <div className="flex items-center gap-2 shrink-0">
              <BSChatInputSTTButton
                supported={stt.supported}
                listening={stt.listening}
                error={stt.error}
                disabled={isStreaming}
                onStart={stt.start}
                onStop={stt.stop}
              />

              {isStreaming ? (
                <button
                  onClick={onStop}
                  className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl px-4 py-2 text-sm transition animate-pulse shrink-0"
                >
                  <Square className="w-3.5 h-3.5" />
                  Stop
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!canSend}
                  className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2 text-sm transition shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <Send className="w-3.5 h-3.5" />
                  Send
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Voice input error hint (e.g. mic permission denied) */}
      {stt.error && !stt.listening && (
        <p className="text-[11px] text-red-500 mt-1.5 px-1">
          Voice input: {stt.error}
        </p>
      )}

      {/* Code editor modal with cover/window view toggle (feature) */}
      <BSChatInputEditorModal
        open={editorModalOpen}
        coverView={editorCoverView}
        value={text}
        onValueChange={setText}
        onClose={closeEditorModal}
        onToggleCoverView={toggleEditorCoverView}
      />

      {/* Instruction editor modal with cover/window view toggle
          (feature: long instruction text) */}
      <BSChatInputEditorModal
        open={instructionModalOpen}
        coverView={instructionCoverView}
        value={instruction}
        onValueChange={setInstruction}
        onClose={closeInstructionModal}
        onToggleCoverView={toggleInstructionCoverView}
        title="Instruction Editor"
      />
    </div>
  );
}

export default BSChatInput;
