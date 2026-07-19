// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCChatView.MessageBubble Sub-Component
// Renders a single chat message — avatar, bubble content, copy button, context
// file badges, question bubbles, error actions, and file action inlines
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot,
  User,
  FileCode,
  Check,
  Copy,
  GitMerge,
  Eye,
  Layers,
} from "lucide-react";
import { Button } from "@heroui/react";
import type { LCChatMessage, LCFileActionResult } from "./LCInterface";
import type { LCPromptModeType } from "./LCPromptMode";
import { InlineFileDiff } from "./LCChatView.FileDiff";
import LCChatViewQuestionBubbles from "./LCChatView.QuestionBubbles";
import LCChatViewErrorActions from "./LCChatView.ErrorActions";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface LCChatViewMessageBubbleProps {
  /** The message data to render */
  msg: LCChatMessage;
  /** Whether this message has the latest file actions (for Accept All/View All) */
  isLatestWithFiles: boolean;
  /** Current prompt mode */
  promptMode?: LCPromptModeType;
  /** Called when user clicks send / selects a question bubble */
  onSendMessage: (content: string) => void;
  /** Called when user clicks Apply on a file action */
  onApplyFileChanges: (fileActions: LCFileActionResult[]) => void;
  /** Called when user clicks the Diff button to open a full Monaco diff */
  onPreviewDiff?: (fileAction: LCFileActionResult) => void;
  /** Callback to read original file content from disk for inline diff */
  onReadFileForDiff?: (filePath: string) => Promise<string>;
  /** Called when user clicks Retry on a failed message */
  onRetryMessage?: (content: string) => void;
  /** Called in non-plan modes to set the input value */
  onSetInput?: (text: string) => void;
  /** Ref to the textarea for focusing after setting input */
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  /** Called when user clicks "View Details" on an error */
  onViewErrorDetails?: (msg: LCChatMessage) => void;
  /** Called when user clicks "Accept All" on the latest file actions */
  onAcceptAll?: () => void;
  /** Called when user clicks "View All Changes" */
  onViewAllChanges?: () => void;
  /** Copied message id for copy feedback */
  copiedMsgId: string | null;
  /** Setter for copiedMsgId */
  onCopiedMsgIdChange: (id: string | null) => void;
  /** Elapsed time in ms for the AI response (shown as lapse badge on assistant messages) */
  responseTimeMs?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Format elapsed ms as a compact human-readable string (e.g. "3.2s", "45.1s", "2m 3s") */
function formatResponseTime(ms: number): string {
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}m ${seconds}s`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LCChatViewMessageBubble({
  msg,
  isLatestWithFiles,
  promptMode = "agent",
  onSendMessage,
  onApplyFileChanges,
  onPreviewDiff,
  onReadFileForDiff,
  onRetryMessage,
  onSetInput,
  textareaRef,
  onViewErrorDetails,
  onAcceptAll,
  onViewAllChanges,
  copiedMsgId,
  onCopiedMsgIdChange,
  responseTimeMs,
}: LCChatViewMessageBubbleProps) {
  const handleCopyMessage = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(msg.content);
      onCopiedMsgIdChange(msg.id);
      setTimeout(() => onCopiedMsgIdChange(null), 2000);
    } catch {}
  }, [msg.content, msg.id, onCopiedMsgIdChange]);

  const handleCopyCode = useCallback(
    async (codeContent: string) => {
      try {
        await navigator.clipboard.writeText(codeContent);
        onCopiedMsgIdChange(`code-${msg.id}`);
        setTimeout(() => onCopiedMsgIdChange(null), 2000);
      } catch {}
    },
    [msg.id, onCopiedMsgIdChange],
  );

  return (
    <div
      className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          msg.role === "user"
            ? "bg-[#e5c07b] text-[#1e1e1e] order-1"
            : "bg-[#2d2d2d] text-[#e5c07b]"
        }`}
      >
        {msg.role === "user" ? (
          <User className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4" />
        )}
      </div>

      {/* Message Bubble */}
      <div
        className={`relative max-w-[75%] rounded-lg px-3 py-2 ${
          msg.role === "user"
            ? "bg-[#e5c07b]/10 border border-[#e5c07b]/20"
            : "bg-[#2d2d2d] border border-[#333333]"
        }`}
      >
        {/* Message content with Markdown for AI, plain text for user */}
        <div>
          {msg.role === "assistant" ? (
            <div className="prose prose-invert prose-sm max-w-none text-[#d4d4d4]">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children, ...props }) {
                    const isInline = !className;
                    if (isInline) {
                      return (
                        <code
                          className="bg-[#3c3c3c] text-[#e5c07b] px-1 py-0.5 rounded text-[13px]"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    }
                    const codeContent = String(children).replace(/\n$/, "");
                    return (
                      <div className="relative group/code my-3">
                        <pre className="bg-[#1e1e1e] border border-[#333333] rounded-lg p-3 overflow-x-auto text-[13px] leading-relaxed">
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </pre>
                        <button
                          onClick={() => handleCopyCode(codeContent)}
                          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover/code:opacity-100 transition-opacity bg-[#3c3c3c] hover:bg-[#4a4a4a] text-[#858585] hover:text-white"
                          title="Copy code block"
                        >
                          {copiedMsgId === `code-${msg.id}` ? (
                            <Check className="w-3 h-3 text-[#98c379]" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    );
                  },
                }}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-[#d4d4d4] whitespace-pre-wrap">
              {msg.content}
            </p>
          )}
        </div>

        {/* Attached context files badge */}
        {msg.contextFiles && msg.contextFiles.length > 0 && (
          <div className="mt-2 pt-2 border-t border-[#333333]/50 flex flex-wrap gap-1">
            <span className="text-[10px] text-[#858585] mr-0.5 leading-5">
              <FileCode className="w-3 h-3 inline mr-0.5 -mt-0.5" />
              Context:
            </span>
            {msg.contextFiles.map((fileName, idx) => (
              <span
                key={idx}
                className="text-[10px] text-[#98c379] bg-[#98c379]/10 px-1.5 py-0.5 rounded-full truncate max-w-[120px]"
                title={fileName}
              >
                {fileName}
              </span>
            ))}
          </div>
        )}

        {/* Question option bubbles (Plan mode) */}
        {msg.questions && msg.questions.length > 0 && (
          <LCChatViewQuestionBubbles
            questions={msg.questions}
            promptMode={promptMode}
            onSendMessage={onSendMessage}
            onSetInput={onSetInput}
            textareaRef={textareaRef}
          />
        )}

        {/* Error actions: View Details + Retry */}
        {msg.error && (
          <LCChatViewErrorActions
            error={msg.error}
            onViewDetails={() => onViewErrorDetails?.(msg)}
            onRetryMessage={onRetryMessage}
          />
        )}

        {/* File Actions with inline diff and accept per file */}
        {msg.fileContents && msg.fileContents.length > 0 && (
          <div className="mt-3 pt-2 border-t border-[#333333] space-y-2">
            {msg.fileContents.map((file, idx) => (
              <InlineFileDiff
                key={idx}
                msgId={msg.id}
                idx={idx}
                file={file}
                onApplyFileChanges={onApplyFileChanges}
                onPreviewDiff={onPreviewDiff}
                onReadFileForDiff={onReadFileForDiff}
              />
            ))}

            {/* Accept All / View All Changes */}
            {isLatestWithFiles && (
              <div className="flex items-center gap-2 pt-2 border-t border-[#333333]/50">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-7 bg-[#98c379]/15 text-[#98c379] hover:bg-[#98c379]/25 flex-1 border-0"
                  onPress={onAcceptAll}
                >
                  <GitMerge className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Accept All ({msg.fileContents.length} files)</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-7 bg-[#61afef]/15 text-[#61afef] hover:bg-[#61afef]/25 border-0"
                  onPress={onViewAllChanges}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">View All Changes</span>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Bottom bar: response time + persistent copy button */}
        <div className="mt-2 pt-1.5 border-t border-[#333333]/40 flex items-center justify-between min-h-[22px]">
          {/* Response time (left side) — assistant messages only */}
          <div>
            {responseTimeMs !== undefined && (
              <span className="text-[10px] text-[#858585] font-mono">
                ⏱ {formatResponseTime(responseTimeMs)}
              </span>
            )}
          </div>

          {/* Copy button (right side, always visible) */}
          <button
            onClick={handleCopyMessage}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-[#858585] hover:text-white hover:bg-[#3c3c3c] transition-colors"
            title="Copy message"
          >
            {copiedMsgId === msg.id ? (
              <>
                <Check className="w-3 h-3 text-[#98c379]" />
                <span className="text-[#98c379] hidden sm:inline">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
