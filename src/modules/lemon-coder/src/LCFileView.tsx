// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCFileView Component (Monaco Editor / DiffEditor / Preview)
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  FileCode,
  RefreshCw,
  AlertTriangle,
  Save,
  ArrowLeftRight,
  Check,
  X,
  Plus,
  Eye,
  Code2,
  MoreVertical,
  WrapText,
} from "lucide-react";
import LCFileViewDisplayMode, {
  canPreviewFile,
  isMarkdownFile,
  isHtmlFile,
} from "./LCFileView.DisplayMode";
import type { LCFileViewDisplayMode as LCFileViewDisplayModeType } from "./LCFileView.DisplayMode";
import type { LCFileTreeItem, LCExternalChangeStatus, LCFileActionResult } from "./LCInterface";

// Dynamically import Monaco DiffEditor to avoid SSR issues
const MonacoDiffEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.DiffEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full text-xs text-[#858585]">
        Loading Diff Editor...
      </div>
    ),
  },
);

export interface LCFileViewProps {
  selectedFile: LCFileTreeItem | null;
  content: string;
  isDirty?: boolean;
  onContentChange: (content: string) => void;
  /** External change status for the active file */
  externalChangeStatus: LCExternalChangeStatus;
  /** Reload the file from disk */
  onReloadFromDisk: () => void;
  /** Dismiss the external-change warning without reloading */
  onAcknowledgeExternalChange: () => void;
  /** Save the current file content to disk */
  onSave: () => void;
  /**
   * When set, the editor renders a Monaco DiffEditor comparing
   * `content` (original) vs `diffContent` (AI-generated).
   */
  diffContent?: string;
  /** Callback when the user accepts the diff changes — applies diffContent */
  onAcceptDiff?: () => void;
  /** Callback when the user rejects / closes the diff preview */
  onRejectDiff?: () => void;
  /** Label shown in the diff header */
  diffLabel?: string;
  /** Add the currently open file to the context stash */
  onAddToStash?: () => void;
  /** Callback to insert text (e.g. a code block) into the chat input */
  onInsertToChatInput?: (text: string) => void;
}

/** Number of seconds of inactivity before an automatic save is triggered. */
const AUTO_SAVE_DELAY_MS = 10_000;

export default function LCFileView({
  selectedFile,
  content,
  isDirty,
  onContentChange,
  externalChangeStatus,
  onReloadFromDisk,
  onAcknowledgeExternalChange,
  onSave,
  diffContent,
  onAcceptDiff,
  onRejectDiff,
  diffLabel,
  onAddToStash,
  onInsertToChatInput,
}: LCFileViewProps) {
  // ── Local State ──────────────────────────────────────────────────────────
  const [displayMode, setDisplayMode] = useState<LCFileViewDisplayModeType>("source");
  const [wordWrap, setWordWrap] = useState(true);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  // ── Auto-save debounce ───────────────────────────────────────────────────
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Diff Preview Mode ────────────────────────────────────────────────────
  const isDiffMode = diffContent !== undefined && selectedFile !== null;

  // ── Auto-save: debounce save when content changes while dirty ──────────
  useEffect(() => {
    // Only auto-save when:
    //   – a file is selected
    //   – content is actually dirty (unsaved changes exist)
    //   – NOT in diff mode (AI-generated preview)
    if (!selectedFile || !isDirty || isDiffMode) return;

    // Clear any pending auto-save timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Schedule a new auto-save
    autoSaveTimerRef.current = setTimeout(() => {
      onSave();
    }, AUTO_SAVE_DELAY_MS);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [content, isDirty, isDiffMode, selectedFile, onSave]);

  // ── Derived display-mode helpers ─────────────────────────────────────────
  const canPreview = selectedFile ? canPreviewFile(selectedFile.name) : false;
  const mdFile = selectedFile ? isMarkdownFile(selectedFile.name) : false;
  const htmlFile = selectedFile ? isHtmlFile(selectedFile.name) : false;

  // Close the header dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setShowHeaderMenu(false);
      }
    }
    if (showHeaderMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showHeaderMenu]);

  if (!selectedFile) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#1e1e1e]">
        <FileCode className="w-16 h-16 text-[#333333] mb-4" />
        <p className="text-sm text-[#858585]">Select a file to view</p>
        <p className="text-xs text-[#858585] mt-1">
          Choose a file from the file tree on the left
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[#1e1e1e]">
      {/* File Tab Header */}
      <div className="flex items-center justify-between px-4 h-9 bg-[#252526] border-b border-[#333333] shrink-0">
        <div className="flex items-center gap-2 px-3 h-full border-r border-[#333333] bg-[#1e1e1e]">
          {isDiffMode ? (
            <ArrowLeftRight className="w-3.5 h-3.5 text-[#e5c07b]" />
          ) : (
            <FileCode className="w-3.5 h-3.5 text-[#e5c07b]" />
          )}
          <span className="text-xs text-[#d4d4d4]">
            {isDiffMode
              ? `Diff: ${diffLabel || selectedFile.name}`
              : `${selectedFile.name}${isDirty ? " *" : ""}`}
          </span>
          {isDiffMode && (
            <span className="text-[10px] text-[#98c379] bg-[#98c379]/10 px-1.5 py-0.5 rounded-full">
              Preview
            </span>
          )}
        </div>

        {/* Source | File View Toggle — only in non-diff mode for previewable files */}
        {!isDiffMode && canPreview && (
          <div className="flex items-center gap-1 bg-[#1e1e1e] rounded-md p-0.5 mx-2">
            <button
              onClick={() => setDisplayMode("source")}
              className={`text-xs h-6 px-2 rounded-md flex items-center gap-1 transition-colors ${
                displayMode === "source"
                  ? "bg-[#e5c07b] text-[#1e1e1e]"
                  : "text-[#858585] hover:text-white hover:bg-[#333333]"
              }`}
              title="View source code"
            >
              <Code2 className="w-3 h-3" />
              <span className="hidden sm:inline">Source</span>
            </button>
            <button
              onClick={() => setDisplayMode("file")}
              className={`text-xs h-6 px-2 rounded-md flex items-center gap-1 transition-colors ${
                displayMode === "file"
                  ? "bg-[#e5c07b] text-[#1e1e1e]"
                  : "text-[#858585] hover:text-white hover:bg-[#333333]"
              }`}
              title={
                mdFile
                  ? "View rendered markdown"
                  : htmlFile
                    ? "View rendered HTML"
                    : "View rendered diagram"
              }
            >
              <Eye className="w-3 h-3" />
              <span className="hidden sm:inline">
                {mdFile ? "Preview" : htmlFile ? "Preview" : "Diagram"}
              </span>
            </button>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Diff-mode action buttons */}
        {isDiffMode ? (
          <div className="flex items-center gap-2">
            <button
              onClick={onRejectDiff}
              className="flex items-center gap-1.5 text-xs h-7 px-3 rounded border border-[#444444] text-[#858585] hover:text-white hover:border-[#e06c75] transition-colors"
              title="Close diff preview"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cancel</span>
            </button>
            <button
              onClick={onAcceptDiff}
              className="flex items-center gap-1.5 text-xs h-7 px-3 rounded bg-[#98c379] text-[#1e1e1e] font-medium hover:bg-[#7daf5e] transition-colors"
              title="Apply the AI-generated changes"
            >
              <Check className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Accept Changes</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {onAddToStash && (
              <button
                onClick={onAddToStash}
                className="flex items-center gap-1.5 text-xs h-7 px-3 rounded border border-[#444444] text-[#858585] hover:text-[#e5c07b] hover:border-[#e5c07b]/40 transition-colors"
                title="Add to context stash"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Stash</span>
              </button>
            )}
            <button
              onClick={onSave}
              className="flex items-center gap-1.5 text-xs h-7 px-3 rounded bg-[#e5c07b] text-[#1e1e1e] font-medium hover:bg-[#d4a84b] transition-colors"
              title="Save file (Ctrl+S)"
            >
              <Save className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Save</span>
            </button>

            {/* Three-dot menu for additional options (non-diff mode only) */}
            <div className="relative" ref={headerMenuRef}>
              <button
                onClick={() => setShowHeaderMenu(!showHeaderMenu)}
                className="flex items-center justify-center w-6 h-6 rounded text-[#858585] hover:text-white hover:bg-[#333333] transition-colors"
                title="More actions"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {showHeaderMenu && (
                <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] bg-[#2d2d2d] border border-[#444444] rounded-md shadow-xl py-1">
                  {htmlFile && (
                    <button
                      onClick={() => {
                        const blob = new Blob([content], { type: "text/html" });
                        const url = URL.createObjectURL(blob);
                        window.open(url, "_blank");
                        setShowHeaderMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left text-[#d4d4d4] hover:bg-[#3c3c3c] transition-colors select-none"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="flex-1">Open HTML in New Tab</span>
                    </button>
                  )}
                  {mdFile && (
                    <button
                      onClick={() => {
                        setWordWrap(!wordWrap);
                        setShowHeaderMenu(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors select-none ${
                        wordWrap
                          ? "text-[#e5c07b]"
                          : "text-[#d4d4d4] hover:bg-[#3c3c3c]"
                      }`}
                    >
                      <WrapText className="w-3.5 h-3.5" />
                      <span className="flex-1">Wrap Lines</span>
                      {wordWrap && <Check className="w-3 h-3 text-[#e5c07b]" />}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Diff preview info bar */}
      {isDiffMode && (
        <div className="flex items-center gap-3 px-4 py-1.5 bg-[#1e2d1e] border-b border-[#333333] shrink-0">
          <span className="text-[11px] text-[#858585]">
            <span className="text-[#abb2bf]">Original</span> ←
            <span className="text-[#98c379]"> AI Generated</span>
          </span>
          <span className="text-[10px] text-[#555]">|</span>
          <span className="text-[10px] text-[#858585]">
            Review the changes below. Green = added, Red = removed.
          </span>
        </div>
      )}

      {/* External Change Banner */}
      {externalChangeStatus.hasExternalChange && !isDiffMode && (
        <div className="flex items-center justify-between px-4 py-2 bg-[#264f78] border-b border-[#1a3a5c] shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#e5c07b] shrink-0" />
            <span className="text-xs text-[#d4d4d4]">
              This file has been modified externally.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onReloadFromDisk}
              className="flex items-center gap-1.5 text-xs h-7 px-3 rounded bg-[#e5c07b] text-[#1e1e1e] font-medium hover:bg-[#d4a84b] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload from Disk
            </button>
            <button
              onClick={onAcknowledgeExternalChange}
              className="text-xs h-7 px-3 rounded text-[#858585] hover:text-white hover:bg-[#333333] transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Editor / Preview Area */}
      {isDiffMode ? (
        <div className="flex-1 overflow-hidden">
          <MonacoDiffEditor
            key={`diff-${selectedFile.path}`}
            height="100%"
            language="plaintext"
            original={content}
            modified={diffContent}
            theme="vs-dark"
            beforeMount={(monaco) => {
              monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
                noSemanticValidation: true,
                noSyntaxValidation: true,
              });
              monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
                noSemanticValidation: true,
                noSyntaxValidation: true,
              });
            }}
            // Prevent "TextModel got disposed before DiffEditorWidget model got reset"
            // when switching away from diff mode. The models are kept alive so the
            // internal DiffEditorWidget can safely reset its model references before
            // the underlying Monaco editor instance is disposed.
            keepCurrentOriginalModel
            keepCurrentModifiedModel
            options={{
              renderSideBySide: true,
              minimap: { enabled: true },
              fontSize: 13,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 8 },
              diffWordWrap: "on",
            }}
          />
        </div>
      ) : (
        /* ── Non-diff content delegated to LCFileViewDisplayMode ─────── */
        <LCFileViewDisplayMode
          displayMode={displayMode}
          selectedFile={selectedFile}
          content={content}
          onContentChange={onContentChange}
          onSave={onSave}
          onInsertToChatInput={onInsertToChatInput}
          wordWrap={wordWrap}
        />
      )}
    </div>
  );
}
