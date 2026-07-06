// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCMainContent Component
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@heroui/react";
import { MessageSquare, FileCode, ArrowLeftRight } from "lucide-react";
import type {
  LCMainViewMode,
  LCFileTreeItem,
  LCChatMessage,
  LCContextStashItem,
  LCFileActionResult,
  LCExternalChangeStatus,
  LCDiffPreview,
  LCInstructionStashItem,
} from "./LCInterface";
import { resolveFilePath } from "./LCInterface";
import type { LCPromptModeType } from "./LCPromptMode";
import LCChatView from "./LCChatView";
import type { LCChatViewHandle } from "./LCChatView";
import LCFileView from "./LCFileView";

export interface LCMainContentProps {
  selectedFile: LCFileTreeItem | null;
  selectedFileContent: string;
  isDirty?: boolean;
  messages: LCChatMessage[];
  stashItems: LCContextStashItem[];
  isSending: boolean;
  onSendMessage: (content: string) => void;
  onApplyFileChanges: (fileActions: LCFileActionResult[]) => void;
  onContentChange: (content: string) => void;
  /** Realtime external change status */
  externalChangeStatus: LCExternalChangeStatus;
  /** Reload active file from disk */
  onReloadFromDisk: () => void;
  /** Dismiss external-change warning */
  onAcknowledgeExternalChange: () => void;
  /** Save the currently open file */
  onSave: () => void;
  /**
   * Read the content of a file from the project filesystem by its relative path.
   * Used to fetch the original file content for diff preview.
   */
  onReadFileContent?: (filePath: string) => Promise<string>;
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
  /** Add the currently selected file to the context stash */
  onAddToStash?: (item: LCFileTreeItem) => void;
  /** Create a new chat session */
  onNewSession?: () => void;
  /** Clear the entire context stash */
  onClearStash?: () => Promise<void>;
  /** Instruction stash items (included in the system prompt) */
  instructionStashItems?: LCInstructionStashItem[];
}

export default function LCMainContent({
  selectedFile,
  selectedFileContent,
  isDirty,
  messages,
  stashItems,
  isSending,
  onSendMessage,
  onApplyFileChanges,
  onContentChange,
  externalChangeStatus,
  onReloadFromDisk,
  onAcknowledgeExternalChange,
  onSave,
  onReadFileContent,
  onRetryMessage,
  promptMode,
  onPromptModeChange,
  sessionTitle,
  onRemoveFromStash,
  onAddToStash,
  onNewSession,
  onClearStash,
  instructionStashItems,
}: LCMainContentProps) {
  const chatViewRef = useRef<LCChatViewHandle>(null);
  const [viewMode, setViewMode] = useState<LCMainViewMode>("chat");
  const [diffPreview, setDiffPreview] = useState<LCDiffPreview | null>(null);

  // Auto-switch to file view when a file is selected from tree.
  // Depends on the selectedFile reference (which is spread into a new object
  // every time selectFile is called) so that re-selecting the same file also
  // triggers a switch from chat view to file view.
  useEffect(() => {
    if (selectedFile && viewMode !== "diff") {
      setViewMode("file");
    }
  }, [selectedFile]);

  // ── Diff Preview Handlers ────────────────────────────────────────────────

  const handlePreviewDiff = useCallback(
    async (fileAction: LCFileActionResult) => {
      const filePath = resolveFilePath(fileAction);

      let originalContent = "";
      if (onReadFileContent && fileAction.ExistingFile) {
        try {
          originalContent = await onReadFileContent(filePath);
        } catch (err) {
          console.warn(
            `[lemon-coder] Could not read original file for diff: ${filePath}`,
            err,
          );
          // If reading failed, the path may have an over-prefixing issue
          // (e.g. "src/modules/..." when handle is at "src/"). Try stripping
          // the first segment and re-reading.
          if (filePath.includes("/")) {
            const strippedPath = filePath.split("/").slice(1).join("/");
            try {
              originalContent = await onReadFileContent(strippedPath);
              console.warn(
                `[lemon-coder] Diff path corrected: "${filePath}" → "${strippedPath}"`,
              );
            } catch {
              // Continue with empty original — will show as all-new content
            }
          }
        }
      }

      setDiffPreview({
        fileAction,
        originalContent,
        filePath,
      });
      setViewMode("diff");
    },
    [onReadFileContent],
  );

  const handleAcceptDiff = useCallback(() => {
    if (!diffPreview) return;

    const action = diffPreview.fileAction;

    // Step 1: Close the diff preview first, which triggers Monaco DiffEditor
    // to begin its model cleanup while LCFileView is still mounted.
    setDiffPreview(null);

    // Step 2: Defer the view-mode switch and file write to the next animation
    // frame, giving Monaco enough time to dispose of its TextModels *before*
    // the component unmounts. This prevents the race condition:
    //   "TextModel got disposed before DiffEditorWidget model got reset"
    requestAnimationFrame(() => {
      onApplyFileChanges([action]);
      setViewMode("chat");
    });
  }, [diffPreview, onApplyFileChanges]);

  const handleRejectDiff = useCallback(() => {
    // Same deferred approach — close the diff preview now, switch view later
    setDiffPreview(null);
    requestAnimationFrame(() => {
      setViewMode("chat");
    });
  }, []);

  // ── Diff preview creates a synthetic "selected file" for LCFileView ─────
  const diffFileItem: LCFileTreeItem | null = diffPreview
    ? {
        id: diffPreview.filePath,
        name: diffPreview.fileAction.FileName,
        path: diffPreview.filePath,
        isDirectory: false,
      }
    : null;

  return (
    <div className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden">
      {/* Content Action Bar */}
      <div className="flex items-center justify-between px-4 h-10 bg-[#252526] border-b border-[#333333] shrink-0">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-[#1e1e1e] rounded-md p-0.5">
          <button
            onClick={() => {
              setViewMode("chat");
              setDiffPreview(null);
            }}
            className={`text-xs h-7 px-3 rounded-md flex items-center gap-1.5 transition-colors ${
              viewMode === "chat"
                ? "bg-[#e5c07b] text-[#1e1e1e]"
                : "text-[#858585] hover:text-white hover:bg-[#333333]"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Chat
          </button>
          <button
            onClick={() => {
              setViewMode("file");
              setDiffPreview(null);
              // Reload file content from disk when switching to file view
              if (selectedFile) {
                onReloadFromDisk();
              }
            }}
            className={`text-xs h-7 px-3 rounded-md flex items-center gap-1.5 transition-colors ${
              viewMode === "file" || viewMode === "diff"
                ? "bg-[#e5c07b] text-[#1e1e1e]"
                : "text-[#858585] hover:text-white hover:bg-[#333333]"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            File
          </button>
          {viewMode === "diff" && diffPreview && (
            <span className="text-[10px] text-[#98c379] bg-[#98c379]/10 px-2 py-0.5 rounded-full ml-1">
              Diff Preview
            </span>
          )}
        </div>

        {/* Right: New Session Button (hidden during diff preview) — replaces Add Code button */}
        {viewMode !== "diff" && (
          <Button
            size="sm"
            variant="ghost"
            onPress={onNewSession}
            className="text-xs h-7 text-[#e5c07b] hover:bg-[#e5c07b]/10"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            New Session
          </Button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/*
         * ── KEY FIX: LCChatView is ALWAYS mounted but hidden when not active ──
         *
         * Previously, LCChatView was conditionally rendered only when
         * viewMode === "chat". This meant that when the user was in File
         * view or Diff view, the chatViewRef.current was null, and the
         * "Add Selection as Code Block to Chat" context menu action in
         * Monaco (which calls chatViewRef.current?.appendToInput) silently
         * did nothing.
         *
         * By keeping LCChatView always mounted (just visually hidden with
         * `display: none`), the ref is always available, and appendToInput
         * works from any view mode.
         */}
        <div
          className={
            viewMode === "chat"
              ? "flex-1 flex flex-col overflow-hidden"
              : "hidden"
          }
        >
          <LCChatView
            ref={chatViewRef}
            messages={messages}
            stashItems={stashItems}
            isSending={isSending}
            onSendMessage={onSendMessage}
            onApplyFileChanges={onApplyFileChanges}
            onPreviewDiff={handlePreviewDiff}
            onReadFileForDiff={onReadFileContent}
            onRetryMessage={onRetryMessage}
            promptMode={promptMode}
            onPromptModeChange={onPromptModeChange}
            sessionTitle={sessionTitle}
            onRemoveFromStash={onRemoveFromStash}
            onClearStash={onClearStash}
            instructionStashItems={instructionStashItems}
          />
        </div>

        {/* File View — shown when viewMode is "file" */}
        {viewMode === "file" && (
          <LCFileView
            selectedFile={selectedFile}
            content={selectedFileContent}
            onContentChange={onContentChange}
            externalChangeStatus={externalChangeStatus}
            onReloadFromDisk={onReloadFromDisk}
            onAcknowledgeExternalChange={onAcknowledgeExternalChange}
            onSave={onSave}
            onAddToStash={
              onAddToStash && selectedFile
                ? () => onAddToStash(selectedFile)
                : undefined
            }
            onInsertToChatInput={(text) => chatViewRef.current?.appendToInput(text)}
          />
        )}

        {/* Diff View — shown when viewMode is "diff" and diffPreview exists */}
        {viewMode === "diff" && diffPreview && (
          <LCFileView
            selectedFile={diffFileItem}
            content={diffPreview.originalContent}
            isDirty={isDirty}
            onContentChange={() => {}}
            externalChangeStatus={{ hasExternalChange: false, diskLastModified: null }}
            onReloadFromDisk={() => {}}
            onAcknowledgeExternalChange={() => {}}
            onSave={() => {}}
            diffContent={diffPreview.fileAction.Content}
            onAcceptDiff={handleAcceptDiff}
            onRejectDiff={handleRejectDiff}
            diffLabel={diffPreview.filePath}
            onInsertToChatInput={(text) => chatViewRef.current?.appendToInput(text)}
          />
        )}
      </div>
    </div>
  );
}
