// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCChatView Component
// Lightweight orchestration layer that wires together all LCChatView.* child
// components and manages local UI state.
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { forwardRef, useImperativeHandle, useState, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { HELIX_PROVIDER_LABELS } from "@/src/modules/helix";
import type { LCChatMessage, LCFileActionResult, LCContextStashItem, LCInstructionStashItem } from "./LCInterface";
import type { LCPromptModeType } from "./LCPromptMode";
import { lcDB } from "./LCDatabase";
import LCChatViewAIInfoBar from "./LCChatView.AIInfoBar";
import LCChatViewMessageList from "./LCChatView.MessageList";
import LCChatViewAttachedContext from "./LCChatView.AttachedContext";
import LCChatViewInstructionStash from "./LCChatView.InstructionStash";
import LCChatViewChatInput from "./LCChatView.ChatInput";
import LCChatViewEditor from "./LCChatView.Editor";
import LCChatViewDetailView from "./LCChatView.DetailView";
import { ViewAllChangesModal } from "./LCChatView.FileDiff";

// ── Props ─────────────────────────────────────────────────────────────────────

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

/** Imperative handle exposed by LCChatView */
export interface LCChatViewHandle {
  /** Append text to the chat input (used by Monaco "Add Code Block" action) */
  appendToInput: (text: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

const LCChatView = forwardRef<LCChatViewHandle, LCChatViewProps>(function LCChatView(
  {
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
  },
  ref,
) {
  // ── Local State ──────────────────────────────────────────────────────────
  const [input, setInput] = useState("");
  const [isInputEditorOpen, setIsInputEditorOpen] = useState(false);
  const [isViewAllChangesOpen, setIsViewAllChangesOpen] = useState(false);
  const [detailViewError, setDetailViewError] = useState<LCChatMessage | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // ── Imperative Handle ────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    appendToInput: (text: string) => {
      setInput((prev) => (prev ? prev + "\n" + text : text));
    },
  }));

  // ── Live Query for AI Settings ───────────────────────────────────────────
  const aiSettings = useLiveQuery(() => lcDB.aiSettings.get("default"));

  const providerLabel = aiSettings?.provider
    ? HELIX_PROVIDER_LABELS[aiSettings.provider] ?? aiSettings.provider
    : "Not configured";
  const modelLabel = aiSettings?.model || "—";

  // ── Derived: Latest File Actions ─────────────────────────────────────────
  const latestFileActions = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === "assistant" && msg.fileContents && msg.fileContents.length > 0) {
        return msg.fileContents;
      }
    }
    return null;
  })();

  // ── Callbacks ────────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    if (!input.trim() || isSending) return;
    onSendMessage(input.trim());
    setInput("");
  }, [input, isSending, onSendMessage]);

  const handleOpenInEditor = useCallback(() => {
    setIsInputEditorOpen(true);
  }, []);

  const handleEditorSave = useCallback((content: string) => {
    setInput(content);
    setIsInputEditorOpen(false);
  }, []);

  const handleAcceptAll = useCallback(() => {
    if (latestFileActions && latestFileActions.length > 0) {
      onApplyFileChanges(
        latestFileActions.map((f) => ({
          FileName: f.FileName,
          ExistingFile: f.ExistingFile,
          FileDirectory: f.FileDirectory,
          Description: f.Description,
          Content: f.Content,
          Edits: f.Edits,
          applyStatus: f.applyStatus,
        })),
      );
    }
  }, [latestFileActions, onApplyFileChanges]);

  const handleSetInput = useCallback((text: string) => {
    setInput(text);
  }, []);

  const handleViewErrorDetails = useCallback((msg: LCChatMessage) => {
    setDetailViewError(msg);
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 bg-[#1e1e1e] overflow-hidden">
      {/* AI Provider Info Bar */}
      <LCChatViewAIInfoBar
        providerLabel={providerLabel}
        modelLabel={modelLabel}
        sessionTitle={sessionTitle}
        stashCount={stashItems.length}
      />

      {/* Messages List */}
      <LCChatViewMessageList
        messages={messages}
        isSending={isSending}
        latestFileActions={latestFileActions}
        onSendMessage={onSendMessage}
        onApplyFileChanges={onApplyFileChanges}
        onPreviewDiff={onPreviewDiff}
        onReadFileForDiff={onReadFileForDiff}
        onRetryMessage={onRetryMessage}
        promptMode={promptMode}
        onSetInput={handleSetInput}
        onViewErrorDetails={handleViewErrorDetails}
        onAcceptAll={handleAcceptAll}
        onViewAllChanges={() => setIsViewAllChangesOpen(true)}
        copiedMsgId={copiedMsgId}
        onCopiedMsgIdChange={setCopiedMsgId}
      />

      {/* Chat Input Area */}
      <div className="border-t border-[#333333]">
        {/* Attached Context — with remove buttons */}
        <LCChatViewAttachedContext
          stashItems={stashItems}
          onRemoveFromStash={onRemoveFromStash}
        />

        {/* Instruction Stash */}
        <LCChatViewInstructionStash
          instructionStashItems={instructionStashItems}
        />

        {/* Input Row */}
        <LCChatViewChatInput
          input={input}
          isSending={isSending}
          stashCount={stashItems.length}
          instructionCount={instructionStashItems.length}
          promptMode={promptMode}
          onInputChange={setInput}
          onSend={handleSend}
          onOpenInEditor={handleOpenInEditor}
          onPromptModeChange={onPromptModeChange}
        />
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
