// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCChatView Component
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { forwardRef, useImperativeHandle, useState, useRef, useEffect, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button, Chip } from "@heroui/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send,
  Bot,
  User,
  Loader2,
  Eye,
  FileCode,
  BrainCircuit,
  Layers,
  GitMerge,
  Code2,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  X,
  Copy,
  Check,
  Terminal,
  BookOpenText,
} from "lucide-react";
import { lcDB } from "./LCDatabase";
import { HELIX_PROVIDER_LABELS } from "@/src/modules/helix";
import type {
  LCChatMessage,
  LCContextStashItem,
  LCFileActionResult,
  LCInstructionStashItem,
} from "./LCInterface";
import type { LCPromptModeType } from "./LCPromptMode";
import { PROMPT_MODE_LABELS } from "./LCPromptMode";
import LCChatViewEditor from "./LCChatView.Editor";
import { InlineFileDiff, ViewAllChangesModal } from "./LCChatView.FileDiff";
import LCChatViewDetailView from "./LCChatView.DetailView";

export interface LCChatViewProps {
  messages: LCChatMessage[];
  stashItems: LCContextStashItem[];
  isSending: boolean;
  onSendMessage: (content: string) => void;
  onApplyFileChanges: (fileActions: LCFileActionResult[]) => void;
  /** Open a diff preview in the Monaco editor for a file action */
  onPreviewDiff?: (fileAction: LCFileActionResult) => void;
  /**
   * Read the original content of a file from disk for the inline diff display.
   * If not provided, the inline diff will show all content as new.
   */
  onReadFileForDiff?: (filePath: string) => Promise<string>;
  /**
   * Callback to retry a failed message. Receives the original user content that failed.
   */
  onRetryMessage?: (content: string) => void;
  /** Current prompt mode (Agent/Plan/Ask) */
  promptMode?: LCPromptModeType;
  /** Callback to change the prompt mode */
  onPromptModeChange?: (mode: LCPromptModeType) => void;
  /** Current session title to display */
  sessionTitle?: string;
  /** Remove a specific item from the context stash */
  onRemoveFromStash?: (id: string) => void;
  /** Clear the entire context stash (called after send in conversation modes) */
  onClearStash?: () => Promise<void>;
  /** Instruction stash items — displayed in the attached context area */
  instructionStashItems?: LCInstructionStashItem[];
}

const modeIcons: Record<LCPromptModeType, React.ReactNode> = {
  agent: <Bot className="w-3 h-3" />,
  plan: <Layers className="w-3 h-3" />,
  ask: <MessageSquare className="w-3 h-3" />,
  code: <Terminal className="w-3 h-3" />,
};

/** Imperative handle exposed by LCChatView */
export interface LCChatViewHandle {
  /** Append text to the chat input (used by Monaco "Add Code Block" action) */
  appendToInput: (text: string) => void;
}

const LCChatView = forwardRef<LCChatViewHandle, LCChatViewProps>(function LCChatView({
  messages,
  stashItems,
  isSending,
  onSendMessage,
  onApplyFileChanges,
  onPreviewDiff,
  onReadFileForDiff,
  onRetryMessage,
  promptMode = "agent",
  onPromptModeChange,
  sessionTitle,
  onRemoveFromStash,
  onClearStash,
  instructionStashItems = [],
}: LCChatViewProps, ref) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Monaco Editor Modal for text input ───────────────────────────────────
  const [isInputEditorOpen, setIsInputEditorOpen] = useState(false);

  // ── View All Changes Modal ───────────────────────────────────────────────
  const [isViewAllChangesOpen, setIsViewAllChangesOpen] = useState(false);

  // ── Error Detail View Modal ──────────────────────────────────────────────
  const [detailViewError, setDetailViewError] = useState<LCChatMessage | null>(null);

  // ── Expose appendToInput imperatively for Monaco "Add Code Block" action ─
  useImperativeHandle(ref, () => ({
    appendToInput: (text: string) => {
      setInput((prev) => (prev ? prev + "\n" + text : text));
      // Focus the textarea after appending
      setTimeout(() => textareaRef.current?.focus(), 0);
    },
  }));

  // ── Copy-to-clipboard feedback ───────────────────────────────────────────
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // Live query for Helix AI settings
  const aiSettings = useLiveQuery(
    () => lcDB.aiSettings.get("default"),
  );

  const providerLabel = aiSettings?.provider
    ? HELIX_PROVIDER_LABELS[aiSettings.provider] ?? aiSettings.provider
    : "Not configured";
  const modelLabel = aiSettings?.model || "—";

  // Auto-scroll to bottom on new messages or when AI finishes sending
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  // Auto-resize textarea when input changes
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || isSending) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Open Monaco Editor Modal with current input ──────────────────────────
  const handleOpenInEditor = () => {
    setIsInputEditorOpen(true);
  };

  const handleEditorSave = (content: string) => {
    setInput(content);
    setIsInputEditorOpen(false);
  };

  // ── Accept All: gather all file actions from the latest assistant message ─
  const latestFileActions = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === "assistant" && msg.fileContents && msg.fileContents.length > 0) {
        return msg.fileContents;
      }
    }
    return null;
  })();

  const handleAcceptAll = () => {
    if (latestFileActions && latestFileActions.length > 0) {
      // Defensively copy every action so downstream handlers cannot accidentally
      // mutate the original fileContents array stored in the message data.
      onApplyFileChanges(
        latestFileActions.map((f) => ({
          FileName: f.FileName,
          ExistingFile: f.ExistingFile,
          FileDirectory: f.FileDirectory,
          Description: f.Description,
          Content: f.Content,
          applyStatus: f.applyStatus,
        })),
      );
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-[#1e1e1e] overflow-hidden">
      {/* AI Provider Info Bar */}
      <div className="flex items-center gap-2 px-4 py-1.5 bg-[#252526] border-b border-[#333333] shrink-0">
        <BrainCircuit className="w-3.5 h-3.5 text-[#e5c07b]" />
        <span className="text-[11px] text-[#858585]">
          AI: <span className="text-[#abb2bf] font-medium">{providerLabel}</span>
          {modelLabel !== "—" && (
            <>
              <span className="mx-1 text-[#555]">/</span>
              <span className="text-[#abb2bf]">{modelLabel}</span>
            </>
          )}
        </span>

        {/* Session Name Display (Request 9) */}
        {sessionTitle && (
          <span className="ml-auto flex items-center gap-1 text-[11px] text-[#61afef] bg-[#61afef]/10 px-2 py-0.5 rounded-full max-w-[200px] truncate">
            <MessageSquare className="w-3 h-3 shrink-0" />
            <span className="truncate">{sessionTitle}</span>
          </span>
        )}

        {!sessionTitle && stashItems.length > 0 && (
          <span className="ml-auto flex items-center gap-1 text-[11px] text-[#98c379] bg-[#98c379]/10 px-2 py-0.5 rounded-full">
            <Layers className="w-3 h-3" />
            {stashItems.length} file{stashItems.length !== 1 ? "s" : ""} in context
          </span>
        )}
      </div>

      {/* Messages Area — with custom scrollbar styling */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-scroll px-4 py-4 space-y-4"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#555 #2a2a2a",
        } as React.CSSProperties}
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
              Configure your AI provider via <strong className="text-[#abb2bf]">AI Config</strong> in the top menu.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
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
              className={`group relative max-w-[75%] rounded-lg px-3 py-2 ${
                msg.role === "user"
                  ? "bg-[#e5c07b]/10 border border-[#e5c07b]/20"
                  : "bg-[#2d2d2d] border border-[#333333]"
              }`}
            >
              {/* Copy button (top-right, visible on hover) */}
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(msg.content);
                    setCopiedMsgId(msg.id);
                    setTimeout(() => setCopiedMsgId(null), 2000);
                  } catch {}
                }}
                className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity bg-[#3c3c3c] hover:bg-[#4a4a4a] text-[#858585] hover:text-white"
                title="Copy message"
              >
                {copiedMsgId === msg.id ? (
                  <Check className="w-3.5 h-3.5 text-[#98c379]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Message content with Markdown for AI, plain text for user */}
              <div className="pr-1">
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
                          return (
                            <div className="relative group/code my-3">
                              <pre className="bg-[#1e1e1e] border border-[#333333] rounded-lg p-3 overflow-x-auto text-[13px] leading-relaxed">
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              </pre>
                              <button
                                onClick={async () => {
                                  const codeContent = String(children).replace(/\n$/, "");
                                  try {
                                    await navigator.clipboard.writeText(codeContent);
                                    setCopiedMsgId(`code-${msg.id}`);
                                    setTimeout(() => setCopiedMsgId(null), 2000);
                                  } catch {}
                                }}
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
                <div className="mt-3 pt-2 border-t border-[#333333] space-y-1.5">
                  <p className="text-[10px] text-[#858585] uppercase tracking-wider font-medium">
                    Suggested next steps:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.questions.map((question, qIdx) => (
                      <button
                        key={qIdx}
                        onClick={() => {
                          if (promptMode === "plan") {
                            // Plan mode: auto-send the selected option
                            onSendMessage(question);
                          } else {
                            // Other modes: set input and focus textarea
                            setInput(question);
                            textareaRef.current?.focus();
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
              )}

              {/* Error actions: View Details + Retry */}
              {msg.error && (
                <div className="mt-2 pt-2 border-t border-[#e06c75]/20 flex items-center gap-2">
                  <Chip
                    size="sm"
                    variant="soft"
                    className="text-[10px] h-5 bg-[#e06c75]/10 text-[#e06c75]"
                  >
                    <AlertTriangle className="w-3 h-3 inline mr-0.5" />
                    {msg.error.name || "Error"}
                  </Chip>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-6 text-[#e06c75] hover:bg-[#e06c75]/10 border-0"
                    onPress={() => setDetailViewError(msg)}
                  >
                    <Eye className="w-3 h-3" />
                    View Details
                  </Button>
                  {onRetryMessage && msg.error.failedContent && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-6 text-[#e5c07b] hover:bg-[#e5c07b]/10 border-0"
                      onPress={() => msg.error?.failedContent && onRetryMessage(msg.error.failedContent)}
                    >
                      <RefreshCw className="w-3 h-3" />
                      Retry
                    </Button>
                  )}
                </div>
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

                  {/* Accept All / View All Changes — shown on the latest assistant message with file actions */}
                  {latestFileActions === msg.fileContents && (
                    <div className="flex items-center gap-2 pt-2 border-t border-[#333333]/50">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7 bg-[#98c379]/15 text-[#98c379] hover:bg-[#98c379]/25 flex-1 border-0"
                        onPress={handleAcceptAll}
                      >
                        <GitMerge className="w-3.5 h-3.5" />
                        Accept All ({latestFileActions.length} files)
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7 bg-[#61afef]/15 text-[#61afef] hover:bg-[#61afef]/25 border-0"
                        onPress={() => setIsViewAllChangesOpen(true)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View All Changes
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isSending && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[#2d2d2d] flex items-center justify-center shrink-0">
              <Loader2 className="w-4 h-4 text-[#e5c07b] animate-spin" />
            </div>
            <div className="bg-[#2d2d2d] rounded-lg px-3 py-2 border border-[#333333]">
              <p className="text-sm text-[#858585]">Thinking...</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Area */}
      <div className="border-t border-[#333333]">
        {/* Attached Context — with remove buttons */}
        {stashItems.length > 0 && (
          <div className="px-4 pt-3 pb-2 border-b border-[#333333]/50">
            <div className="flex items-center gap-1.5 mb-2">
              <Layers className="w-3.5 h-3.5 text-[#e5c07b]" />
              <span className="text-[11px] text-[#858585] font-medium uppercase tracking-wide">
                Attached Context
              </span>
              <span className="text-[10px] text-[#858585] bg-[#3c3c3c] px-1.5 py-0.5 rounded-full">
                {stashItems.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {stashItems.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center gap-1.5 bg-[#2d2d2d] border border-[#444444] rounded-md px-2 py-1 text-[11px] text-[#abb2bf] hover:border-[#e5c07b]/40 hover:bg-[#2d2d2d] transition-colors"
                >
                  {item.isDirectory ? (
                    <Layers className="w-3 h-3 text-[#61afef] shrink-0" />
                  ) : (
                    <FileCode className="w-3 h-3 text-[#98c379] shrink-0" />
                  )}
                  <span className="truncate max-w-[140px]" title={item.path}>
                    {item.name}
                  </span>
                  <span className="hidden group-hover:inline text-[10px] text-[#555] ml-0.5 truncate max-w-[100px]">
                    {item.path.replace(/^.*[\\/]/, "") !== item.name &&
                      `— ${item.path}`}
                  </span>

                  {/* Remove button for attached context item */}
                  {onRemoveFromStash && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFromStash(item.id);
                      }}
                      className="w-4 h-4 flex items-center justify-center rounded text-[#858585] hover:text-red-400 hover:bg-red-400/10 transition-colors ml-0.5 shrink-0"
                      title="Remove from context"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instruction Stash — shown in attached context area */}
        {instructionStashItems && instructionStashItems.length > 0 && (
          <div className="px-4 pt-3 pb-2 border-b border-[#333333]/50">
            <div className="flex items-center gap-1.5 mb-2">
              <BookOpenText className="w-3.5 h-3.5 text-[#98c379]" />
              <span className="text-[11px] text-[#858585] font-medium uppercase tracking-wide">
                Instructions in System Prompt
              </span>
              <span className="text-[10px] text-[#858585] bg-[#3c3c3c] px-1.5 py-0.5 rounded-full">
                {instructionStashItems.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {instructionStashItems.map((inst) => (
                <div
                  key={inst.id}
                  className="group flex items-start gap-1.5 bg-[#2d2d2d] border border-[#444444] rounded-md px-2 py-1 text-[11px] text-[#abb2bf] hover:border-[#98c379]/40 hover:bg-[#2d2d2d] transition-colors max-w-full"
                >
                  <BookOpenText className="w-3 h-3 text-[#98c379] shrink-0 mt-0.5" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate font-medium text-[#d4d4d4]">
                      {inst.name}
                    </span>
                    <span className="text-[10px] text-[#858585] line-clamp-2 leading-relaxed">
                      {inst.content}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Row */}
        <div className="px-4 py-3">
          <div className="flex flex-col gap-2">
            {/* Textarea + Send Button Row */}
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    stashItems.length > 0
                      ? `Ask with ${stashItems.length} file${stashItems.length !== 1 ? "s" : ""} in context...`
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
                onPress={handleSend}
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
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleOpenInEditor}
                  disabled={isSending}
                  className="flex items-center gap-1 text-[10px] text-[#858585] hover:text-[#e5c07b] transition-colors px-2 py-1 rounded hover:bg-[#2d2d2d] disabled:opacity-40"
                  title="Open in Monaco Editor"
                >
                  <Code2 className="w-3 h-3" />
                  Open in Editor
                </button>
                <span className="text-[#444] text-[10px]">|</span>
                <span className="text-[10px] text-[#555]">
                  <kbd className="text-[#858585] bg-[#2d2d2d] px-1 rounded">Enter</kbd> send · <kbd className="text-[#858585] bg-[#2d2d2d] px-1 rounded">Shift+Enter</kbd> new line
                </span>
              </div>

              {/* Mode Selector (moved to below input) */}
              {onPromptModeChange && (
                <div className="flex items-center gap-0.5 bg-[#2d2d2d] rounded-md p-0.5 border border-[#333333]">
                  {(Object.keys(PROMPT_MODE_LABELS) as LCPromptModeType[]).map((mode) => (
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
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Monaco Editor Modal (for text input) */}
      <LCChatViewEditor
        isOpen={isInputEditorOpen}
        initialContent={input}
        onSave={handleEditorSave}
        onClose={() => setIsInputEditorOpen(false)}
      />

      {/* View All Changes Modal */}
      <ViewAllChangesModal
        isOpen={isViewAllChangesOpen}
        onClose={() => setIsViewAllChangesOpen(false)}
        latestFileActions={latestFileActions}
        onApplyFileChanges={onApplyFileChanges}
        onPreviewDiff={onPreviewDiff}
        onReadFileForDiff={onReadFileForDiff}
      />

      {/* Error Detail View Modal */}
      <LCChatViewDetailView
        isOpen={detailViewError !== null}
        onClose={() => setDetailViewError(null)}
        error={detailViewError?.error ?? null}
        onRetry={onRetryMessage ? (content) => onRetryMessage(content) : undefined}
      />
    </div>
  );
});

export default LCChatView;
