// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCChatView.MessageList Sub-Component
// Renders the full list of messages, the empty state, and the typing indicator.
// Handles auto-scroll logic.
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useRef, useState } from "react";
import { Bot } from "lucide-react";
import type { LCChatMessage, LCFileActionResult } from "./LCInterface";
import type { LCPromptModeType } from "./LCPromptMode";
import LCChatViewMessageBubble from "./LCChatView.MessageBubble";
import LCChatViewTypingIndicator from "./LCChatView.TypingIndicator";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface LCChatViewMessageListProps {
  /** All chat messages */
  messages: LCChatMessage[];
  /** Whether the AI is currently sending/processing */
  isSending: boolean;
  /** Latest file actions from the most recent assistant message */
  latestFileActions: LCFileActionResult[] | null;
  /** Called when user clicks send / selects a question bubble */
  onSendMessage: (content: string) => void;
  /** Called when user clicks Apply on a file action */
  onApplyFileChanges: (fileActions: LCFileActionResult[]) => void;
  /** Called when user clicks the Diff button */
  onPreviewDiff?: (fileAction: LCFileActionResult) => void;
  /** Callback to read original file content from disk for inline diff */
  onReadFileForDiff?: (filePath: string) => Promise<string>;
  /** Called when user clicks Retry on a failed message */
  onRetryMessage?: (content: string) => void;
  /** Current prompt mode */
  promptMode?: LCPromptModeType;
  /** Called in non-plan modes to set the input value */
  onSetInput?: (text: string) => void;
  /** Ref to the textarea for focusing after setting input */
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  /** Called when user clicks "View Details" on an error */
  onViewErrorDetails?: (msg: LCChatMessage) => void;
  /** Called when user clicks "Accept All" */
  onAcceptAll?: () => void;
  /** Called when user clicks "View All Changes" */
  onViewAllChanges?: () => void;
  /** Copied message id for copy feedback */
  copiedMsgId: string | null;
  /** Setter for copiedMsgId */
  onCopiedMsgIdChange: (id: string | null) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LCChatViewMessageList({
  messages,
  isSending,
  latestFileActions,
  onSendMessage,
  onApplyFileChanges,
  onPreviewDiff,
  onReadFileForDiff,
  onRetryMessage,
  promptMode,
  onSetInput,
  textareaRef,
  onViewErrorDetails,
  onAcceptAll,
  onViewAllChanges,
  copiedMsgId,
  onCopiedMsgIdChange,
}: LCChatViewMessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const thinkingStartTimeRef = useRef<number>(0);
  const prevIsSendingRef = useRef<boolean>(false);
  const [responseTimeMs, setResponseTimeMs] = useState<number | null>(null);

  // Track when thinking starts / ends
  useEffect(() => {
    if (isSending && !prevIsSendingRef.current) {
      // Thinking just started — record the timestamp
      thinkingStartTimeRef.current = Date.now();
      setResponseTimeMs(null);
    } else if (!isSending && prevIsSendingRef.current) {
      // Thinking just finished — calculate elapsed time
      setResponseTimeMs(Date.now() - thinkingStartTimeRef.current);
    }
    prevIsSendingRef.current = isSending;
  }, [isSending]);

  // Auto-scroll to bottom on new messages or when AI finishes sending
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  return (
    <div
      className="flex-1 overflow-y-scroll px-4 py-4 space-y-4"
      style={
        {
          scrollbarWidth: "thin",
          scrollbarColor: "#555 #2a2a2a",
        } as React.CSSProperties
      }
    >
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <Bot className="w-12 h-12 text-[#e5c07b] mb-4 opacity-50" />
          <p className="text-sm text-[#858585]">
            Ask Lemon Coder to write or modify code.
          </p>
          <p className="text-xs text-[#858585] mt-1">
            Files stashed in the right sidebar will be included as context.
          </p>
          <p className="text-xs text-[#555] mt-3">
            Configure your AI provider via{" "}
            <strong className="text-[#abb2bf]">AI Config</strong> in the top
            menu.
          </p>
        </div>
      )}

      {messages.map((msg, idx) => (
        <LCChatViewMessageBubble
          key={msg.id}
          msg={msg}
          isLatestWithFiles={latestFileActions === msg.fileContents}
          /** Show response time on the last assistant message when thinking just finished */
          responseTimeMs={
            msg.role === "assistant" && idx === messages.length - 1 && responseTimeMs !== null
              ? responseTimeMs
              : undefined
          }
          promptMode={promptMode}
          onSendMessage={onSendMessage}
          onApplyFileChanges={onApplyFileChanges}
          onPreviewDiff={onPreviewDiff}
          onReadFileForDiff={onReadFileForDiff}
          onRetryMessage={onRetryMessage}
          onSetInput={onSetInput}
          textareaRef={textareaRef}
          onViewErrorDetails={onViewErrorDetails}
          onAcceptAll={onAcceptAll}
          onViewAllChanges={onViewAllChanges}
          copiedMsgId={copiedMsgId}
          onCopiedMsgIdChange={onCopiedMsgIdChange}
        />
      ))}

      {/* Typing indicator with running seconds counter */}
      {isSending && (
        <LCChatViewTypingIndicator
          thinkingStartTime={thinkingStartTimeRef.current}
        />
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
