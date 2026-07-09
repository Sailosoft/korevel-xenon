// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCChatView.ChatInput Sub-Component
// Renders the textarea, send button, mode selector, and "Open in Editor" button
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useRef, useEffect, useState } from "react";
import { Button } from "@heroui/react";
import {
  Send,
  Loader2,
  Code2,
  Bot,
  Layers,
  MessageSquare,
  Terminal,
} from "lucide-react";
import type { LCPromptModeType } from "./LCPromptMode";
import { PROMPT_MODE_LABELS } from "./LCPromptMode";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface LCChatViewChatInputProps {
  /** Current input value */
  input: string;
  /** Whether the AI is currently sending */
  isSending: boolean;
  /** Number of items in the context stash (for placeholder text) */
  stashCount: number;
  /** Current prompt mode */
  promptMode: LCPromptModeType;
  /** Called when the input value changes */
  onInputChange: (value: string) => void;
  /** Called when the user clicks Send or presses Enter */
  onSend: () => void;
  /** Called when the user clicks "Open in Editor" */
  onOpenInEditor: () => void;
  /** Called when the prompt mode is changed */
  onPromptModeChange?: (mode: LCPromptModeType) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const modeIcons: Record<LCPromptModeType, React.ReactNode> = {
  agent: <Bot className="w-3 h-3" />,
  plan: <Layers className="w-3 h-3" />,
  ask: <MessageSquare className="w-3 h-3" />,
  code: <Terminal className="w-3 h-3" />,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function LCChatViewChatInput({
  input,
  isSending,
  stashCount,
  promptMode,
  onInputChange,
  onSend,
  onOpenInEditor,
  onPromptModeChange,
}: LCChatViewChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea when input changes
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="px-4 py-3">
      <div className="flex flex-col gap-2">
        {/* Textarea + Send Button Row */}
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                stashCount > 0
                  ? `Ask with ${stashCount} file${stashCount !== 1 ? "s" : ""} in context...`
                  : "Ask Lemon Coder to help with your code..."
              }
              disabled={isSending}
              rows={1}
              className="w-full bg-[#3c3c3c] text-sm text-[#d4d4d4] placeholder:text-[#858585] border border-[#333333] rounded-lg px-3 py-2 outline-none focus:border-[#e5c07b] transition-colors resize-none overflow-y-auto min-h-[40px] max-h-[200px]"
              style={{ scrollbarWidth: "thin" }}
            />
          </div>
          <Button
            isIconOnly
            onPress={onSend}
            isDisabled={!input.trim() || isSending}
            className="bg-[#e5c07b] text-[#1e1e1e] hover:bg-[#d4a84b] min-w-[40px] h-[40px] shrink-0"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Action buttons row below input */}
        <div className="flex items-center justify-between gap-1.5">
          {/* Mode Selector — moved to the left side */}
          {onPromptModeChange && (
            <div className="flex items-center gap-0.5 bg-[#2d2d2d] rounded-md p-0.5 border border-[#333333]">
              {(Object.keys(PROMPT_MODE_LABELS) as LCPromptModeType[]).map(
                (mode) => (
                  <button
                    key={mode}
                    onClick={() => onPromptModeChange(mode)}
                    className={`flex items-center gap-1 text-[10px] h-5 px-1.5 rounded transition-colors ${
                      promptMode === mode
                        ? "bg-[#e5c07b] text-[#1e1e1e]"
                        : "text-[#858585] hover:text-white"
                    }`}
                    title={PROMPT_MODE_LABELS[mode]}
                  >
                    {modeIcons[mode]}
                    {PROMPT_MODE_LABELS[mode]}
                  </button>
                ),
              )}
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenInEditor}
              disabled={isSending}
              className="flex items-center gap-1 text-[10px] text-[#858585] hover:text-[#e5c07b] transition-colors px-2 py-1 rounded hover:bg-[#2d2d2d] disabled:opacity-40"
              title="Open in Monaco Editor"
            >
              <Code2 className="w-3 h-3" />
              Open in Editor
            </button>
            <span className="text-[#444] text-[10px]">|</span>
            <span className="text-[10px] text-[#555]">
              <kbd className="text-[#858585] bg-[#2d2d2d] px-1 rounded">
                Enter
              </kbd>{" "}
              send ·{" "}
              <kbd className="text-[#858585] bg-[#2d2d2d] px-1 rounded">
                Shift+Enter
              </kbd>{" "}
              new line
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
