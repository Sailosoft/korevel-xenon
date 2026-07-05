// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCFileView Component (Monaco Editor / DiffEditor)
// ───────────────────────────────────────────────────────────────────────────────

"use client";

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
} from "lucide-react";
import type { LCFileTreeItem, LCExternalChangeStatus, LCFileActionResult } from "./LCInterface";

// Dynamically import Monaco Editor and DiffEditor to avoid SSR issues
const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full text-xs text-[#858585]">
        Loading Editor...
      </div>
    ),
  },
);

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
}

function getLanguage(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const languageMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    md: "markdown",
    css: "css",
    scss: "scss",
    html: "html",
    py: "python",
    rs: "rust",
    go: "go",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    sql: "sql",
    sh: "shell",
    bash: "shell",
    dockerfile: "dockerfile",
    gitignore: "ignore",
    env: "dotenv",
    xml: "xml",
    svg: "xml",
    txt: "plaintext",
  };
  return languageMap[ext] || "plaintext";
}

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
}: LCFileViewProps) {
  // ── Diff Preview Mode ────────────────────────────────────────────────────
  const isDiffMode = diffContent !== undefined && selectedFile !== null;

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
    <div className="flex flex-col flex-1 bg-[#1e1e1e]">
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

        {/* Diff-mode action buttons */}
        {isDiffMode ? (
          <div className="flex items-center gap-2">
            <button
              onClick={onRejectDiff}
              className="flex items-center gap-1.5 text-xs h-7 px-3 rounded border border-[#444444] text-[#858585] hover:text-white hover:border-[#e06c75] transition-colors"
              title="Close diff preview"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
            <button
              onClick={onAcceptDiff}
              className="flex items-center gap-1.5 text-xs h-7 px-3 rounded bg-[#98c379] text-[#1e1e1e] font-medium hover:bg-[#7daf5e] transition-colors"
              title="Apply the AI-generated changes"
            >
              <Check className="w-3.5 h-3.5" />
              Accept Changes
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
                Stash
              </button>
            )}
            <button
              onClick={onSave}
              className="flex items-center gap-1.5 text-xs h-7 px-3 rounded bg-[#e5c07b] text-[#1e1e1e] font-medium hover:bg-[#d4a84b] transition-colors"
              title="Save file (Ctrl+S)"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
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

      {/* Monaco Editor / DiffEditor */}
      <div className="flex-1 overflow-hidden">
        {isDiffMode ? (
          <MonacoDiffEditor
            key={`diff-${selectedFile.path}`}
            height="100%"
            language={getLanguage(selectedFile.name)}
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
        ) : (
          <MonacoEditor
            key={selectedFile.path}
            height="100%"
            language={getLanguage(selectedFile.name)}
            value={content}
            onChange={(val) => onContentChange(val || "")}
            onMount={(editor, monaco) => {
              editor.addCommand(
                monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
                onSave,
              );
            }}
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
            options={{
              minimap: { enabled: true },
              fontSize: 13,
              lineNumbers: "on",
              renderWhitespace: "selection",
              tabSize: 2,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 8 },
            }}
          />
        )}
      </div>
    </div>
  );
}
