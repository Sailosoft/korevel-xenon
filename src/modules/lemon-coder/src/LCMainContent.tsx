// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCMainContent Component
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from "react";
import { Button, toast } from "@heroui/react";
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
import { applySearchReplace } from "./useLCChat";

/** Imperative handle exposed by LCMainContent */
export interface LCMainContentHandle {
  /** Append text to the chat input */
  appendToInput: (text: string) => void;
}

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

const LCMainContent = forwardRef<LCMainContentHandle, LCMainContentProps>(function LCMainContent({
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
}: LCMainContentProps, ref) {
  const chatViewRef = useRef<LCChatViewHandle>(null);
  const [viewMode, setViewMode] = useState<LCMainViewMode>("chat");

  // Expose appendToInput via imperative handle
  useImperativeHandle(ref, () => ({
    appendToInput: (text: string) => {
      chatViewRef.current?.appendToInput(text);
    },
  }), []);
  const [diffPreview, setDiffPreview] = useState<LCDiffPreview | null>(null);
  const [diffWarning, setDiffWarning] = useState<string | null>(null);

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
      let readError: unknown = null;
      if (onReadFileContent && fileAction.ExistingFile) {
        try {
          originalContent = await onReadFileContent(filePath);
        } catch (err) {
          readError = err;
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
              readError = null; // Fallback succeeded — clear the error
            } catch {
              // Fallback also failed — will show toast + rethrow below
            }
          }
        }

        // If all read attempts failed, notify the user and rethrow
        if (readError) {
          const msg =
            readError instanceof Error
              ? readError.message
              : String(readError);
          toast.danger(`Could not read original file for diff: ${msg}`);
          throw readError;
        }
      }

      let resolvedContent = fileAction.Content;
      let warning: string | null = null;

      // If Content is empty but Edits exist, compute diff content from original + edits
      if (!resolvedContent && Array.isArray(fileAction.Edits) && fileAction.Edits.length > 0 && originalContent) {
        try {
          const result = applySearchReplace(originalContent, fileAction.Edits);
          resolvedContent = result.content;
        } catch (err) {
          // ── Fallback: Build a best-effort preview from Replace blocks ──
          // When SEARCH/REPLACE can't match, we can't compute an accurate diff.
          // Instead, construct a "raw AI output" from the Replace blocks so
          // the user can still review what the AI intended to change.
          const replaceBlocks = fileAction.Edits!.map((e, i) => {
            const desc = e.Description || `Edit ${i + 1}`;
            return `// === AI: ${desc} ===\n${e.Replace}`;
          }).join("\n\n");

          resolvedContent = [
            "// ═══════════════════════════════════════════════════════════",
            `// ⚠ SEARCH/REPLACE could not match the current file content.`,
            `// The diff below shows the AI's intended replacements as a`,
            `// raw preview. Verify each block manually before applying.`,
            "// ═══════════════════════════════════════════════════════════",
            "",
            replaceBlocks,
          ].join("\n");

          warning = "SEARCH/REPLACE did not match — showing AI's intended replacements as a raw preview. Verify before applying.";
          console.warn(
            `[lemon-coder] Could not compute diff from SEARCH/REPLACE for ${filePath}:`,
            err,
          );
        }
      }

      setDiffWarning(warning);
      setDiffPreview({
        fileAction: resolvedContent !== fileAction.Content
          ? { ...fileAction, Content: resolvedContent }
          : fileAction,
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
    setDiffPreview(null);
    setDiffWarning(null);
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
              setDiffWarning(null);
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
            isDirty={isDirty}
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
            diffWarning={diffWarning ?? undefined}
            onAcceptDiff={handleAcceptDiff}
            onRejectDiff={handleRejectDiff}
            diffLabel={diffPreview.filePath}
            onInsertToChatInput={(text) => chatViewRef.current?.appendToInput(text)}
          />
        )}
      </div>
    </div>
  );
});

export default LCMainContent;
