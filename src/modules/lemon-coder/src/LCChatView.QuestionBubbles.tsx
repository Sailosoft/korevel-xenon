// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCChatView.QuestionBubbles Sub-Component
// Selectable question/option bubbles from Plan mode responses
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { MessageSquare } from "lucide-react";
import type { LCPromptModeType } from "./LCPromptMode";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface LCChatViewQuestionBubblesProps {
  /** The question/option strings to render as selectable bubbles */
  questions: string[];
  /** Current prompt mode — affects click behaviour */
  promptMode?: LCPromptModeType;
  /** Called when a question bubble is clicked (auto-send in plan mode) */
  onSendMessage: (content: string) => void;
  /** Called in non-plan modes to set the input value and focus textarea */
  onSetInput?: (text: string) => void;
  /** Ref to the textarea for focusing after setting input */
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LCChatViewQuestionBubbles({
  questions,
  promptMode = "agent",
  onSendMessage,
  onSetInput,
  textareaRef,
}: LCChatViewQuestionBubblesProps) {
  if (questions.length === 0) return null;

  return (
    <div className="mt-3 pt-2 border-t border-[#333333] space-y-1.5">
      <p className="text-[10px] text-[#858585] uppercase tracking-wider font-medium">
        Suggested next steps:
      </p>
      <div className="flex flex-wrap gap-1.5">
        {questions.map((question, qIdx) => (
          <button
            key={qIdx}
            onClick={() => {
              if (promptMode === "plan") {
                // Plan mode: auto-send the selected option
                onSendMessage(question);
              } else {
                // Other modes: set input and focus textarea
                onSetInput?.(question);
                setTimeout(() => textareaRef?.current?.focus(), 0);
              }
            }}
            className="text-xs px-3 py-1.5 rounded-full border border-[#e5c07b]/30 bg-[#e5c07b]/5 text-[#e5c07b] hover:bg-[#e5c07b]/15 hover:border-[#e5c07b]/60 transition-colors text-left"
          >
            <MessageSquare className="w-3 h-3 inline mr-1 -mt-0.5" />
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
