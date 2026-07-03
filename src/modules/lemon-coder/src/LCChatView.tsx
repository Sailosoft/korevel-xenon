// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCChatView Component
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button, Input, Chip } from "@heroui/react";
import { Send, Bot, User, Loader2, Check, FileCode, BrainCircuit, Layers, ArrowLeftRight } from "lucide-react";
import { lcDB } from "./LCDatabase";
import { HELIX_PROVIDER_LABELS } from "@/src/modules/helix";
import type {
  LCChatMessage,
  LCContextStashItem,
  LCFileActionResult,
} from "./LCInterface";
import LCDiffDisplay from "./LCDiffDisplay";

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
}

export default function LCChatView({
  messages,
  stashItems,
  isSending,
  onSendMessage,
  onApplyFileChanges,
  onPreviewDiff,
  onReadFileForDiff,
}: LCChatViewProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Track which file actions have their inline diff expanded
  // Key: "msgId:fileIdx" — value: the original content (or null while loading)
  const [expandedDiffs, setExpandedDiffs] = useState<Record<string, string | null | "loading">>({});

  // Live query for Helix AI settings — shows active provider/model
  const aiSettings = useLiveQuery(
    () => lcDB.aiSettings.get("default"),
  );

  // Resolve the provider label for display
  const providerLabel = aiSettings?.provider
    ? HELIX_PROVIDER_LABELS[aiSettings.provider] ?? aiSettings.provider
    : "Not configured";
  const modelLabel = aiSettings?.model || "—";

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  return (
    <div className="flex flex-col flex-1 bg-[#1e1e1e]">
      {/* AI Provider Info Bar — also shows stash context status */}
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
        {/* Stash context indicator — visible when stash items are present */}
        {stashItems.length > 0 && (
          <span className="ml-auto flex items-center gap-1 text-[11px] text-[#98c379] bg-[#98c379]/10 px-2 py-0.5 rounded-full">
            <Layers className="w-3 h-3" />
            {stashItems.length} file{stashItems.length !== 1 ? "s" : ""} in context
          </span>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
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
              className={`max-w-[75%] rounded-lg px-3 py-2 ${
                msg.role === "user"
                  ? "bg-[#e5c07b]/10 border border-[#e5c07b]/20"
                  : "bg-[#2d2d2d] border border-[#333333]"
              }`}
            >
              <p className="text-sm text-[#d4d4d4] whitespace-pre-wrap">
                {msg.content}
              </p>

              {/* File Actions (if any) — with inline diff and monaco diff preview */}
              {msg.fileContents && msg.fileContents.length > 0 && (
                <div className="mt-3 pt-2 border-t border-[#333333] space-y-2">
                  {msg.fileContents.map((file, idx) => {
                    const diffKey = `${msg.id}:${idx}`;
                    const diffState = expandedDiffs[diffKey];

                    const handleToggleDiff = async () => {
                      if (diffState !== undefined) {
                        // Already expanded — collapse
                        setExpandedDiffs((prev) => {
                          const next = { ...prev };
                          delete next[diffKey];
                          return next;
                        });
                        return;
                      }

                      // Mark as loading
                      setExpandedDiffs((prev) => ({
                        ...prev,
                        [diffKey]: "loading",
                      }));

                      // Read original content
                      let originalContent: string | null = null;
                      const filePath = file.FileDirectory
                        ? `${file.FileDirectory}/${file.FileName}`
                        : file.FileName;

                      if (onReadFileForDiff && file.ExistingFile) {
                        try {
                          originalContent = await onReadFileForDiff(filePath);
                        } catch {
                          // Fall through — show all as new
                        }
                      }

                      setExpandedDiffs((prev) => ({
                        ...prev,
                        [diffKey]: originalContent ?? "",
                      }));
                    };

                    return (
                      <div key={idx}>
                        {/* File action header row */}
                        <div className="flex items-center justify-between gap-2">
                          {/* Clickable file info */}
                          <button
                            onClick={handleToggleDiff}
                            className="flex items-center gap-1.5 text-xs text-[#abb2bf] hover:text-[#e5c07b] transition-colors text-left flex-1 min-w-0 group"
                          >
                            <FileCode className="w-3 h-3 text-[#e5c07b] shrink-0" />
                            <span className="truncate max-w-[150px] group-hover:underline decoration-dotted underline-offset-2">
                              {file.FileDirectory}/{file.FileName}
                            </span>
                            <Chip
                              size="sm"
                              variant="soft"
                              className={`text-[10px] h-5 ${
                                file.ExistingFile
                                  ? "bg-[#e5c07b]/10 text-[#e5c07b]"
                                  : "bg-[#98c379]/10 text-[#98c379]"
                              }`}
                            >
                              {file.ExistingFile ? "Update" : "New"}
                            </Chip>
                          </button>

                          {/* Action buttons */}
                          <div className="flex items-center gap-1 shrink-0">
                            {onPreviewDiff && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs h-6 text-[#61afef] hover:bg-[#61afef]/10"
                                onPress={() => onPreviewDiff(file)}
                              >
                                <ArrowLeftRight className="w-3 h-3" />
                                Diff
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-6 text-[#98c379] hover:bg-[#98c379]/10"
                              onPress={() => onApplyFileChanges([file])}
                            >
                              <Check className="w-3 h-3" />
                              Apply
                            </Button>
                          </div>
                        </div>

                        {/* Inline diff display */}
                        {diffState && diffState !== "loading" && (
                          <div className="mt-2">
                            <LCDiffDisplay
                              original={diffState}
                              modified={file.Content}
                              fileName={`${file.FileDirectory}/${file.FileName}`}
                              isExisting={file.ExistingFile}
                              defaultCollapsed={false}
                            />
                          </div>
                        )}
                        {diffState === "loading" && (
                          <div className="mt-2 flex items-center gap-2 px-3 py-2 text-[11px] text-[#858585] bg-[#252526] rounded-md">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Loading diff...
                          </div>
                        )}
                      </div>
                    );
                  })}
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

      {/* Chat Input */}
      <div className="border-t border-[#333333]">
        {/* Attached Context — stash items shown as attachment chips above the input */}
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
                  <span className="truncate max-w-[160px]" title={item.path}>
                    {item.name}
                  </span>
                  <span className="hidden group-hover:inline text-[10px] text-[#555] ml-0.5 truncate max-w-[120px]">
                    {item.path.replace(/^.*[\\/]/, "") !== item.name &&
                      `— ${item.path}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Row */}
        <div className="px-4 py-3">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                stashItems.length > 0
                  ? `Ask with ${stashItems.length} file${stashItems.length !== 1 ? "s" : ""} in context...`
                  : "Ask Lemon Coder to help with your code..."
              }
              disabled={isSending}
              className="flex-1 bg-[#3c3c3c] text-sm text-[#d4d4d4] placeholder:text-[#858585] border border-[#333333] rounded-lg px-3 py-2 outline-none focus:border-[#e5c07b] transition-colors"
            />
            <Button
              isIconOnly
              onPress={handleSend}
              isDisabled={!input.trim() || isSending}
              className="bg-[#e5c07b] text-[#1e1e1e] hover:bg-[#d4a84b] min-w-[40px] h-[40px]"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
