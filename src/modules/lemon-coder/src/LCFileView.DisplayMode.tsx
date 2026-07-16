// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCFileView.DisplayMode Sub-Component
// Renders file content based on display mode: Monaco editor for source,
// or the Render Module's RenderView for previewable files (markdown, mermaid,
// mindmap, html, etc.).
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { RenderView, registerBuiltinAdapters } from "@/src/modules/render";
import type { RenderFormat } from "@/src/modules/render";
import type { LCFileTreeItem } from "./LCInterface";

// ── Dynamically import Monaco Editor to avoid SSR issues ────────────────────

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

// ── Language detection (shared utility) ─────────────────────────────────────

export function getLanguage(fileName: string): string {
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

// ── File extension helpers ──────────────────────────────────────────────────

export function getFileExt(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

export function isMarkdownFile(fileName: string): boolean {
  return getFileExt(fileName) === "md" && !fileName.toLowerCase().endsWith(".mm.md");
}

export function isMermaidFile(fileName: string): boolean {
  const ext = getFileExt(fileName);
  return ext === "mermaid" || ext === "mmd";
}

export function isMindmapFile(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(".mm.md");
}

export function isHtmlFile(fileName: string): boolean {
  return getFileExt(fileName) === "html";
}

export function canPreviewFile(fileName: string): boolean {
  return isMarkdownFile(fileName) || isMermaidFile(fileName) || isMindmapFile(fileName) || isHtmlFile(fileName);
}

// ── Map file name to RenderFormat ───────────────────────────────────────────

function getRenderFormat(fileName: string): RenderFormat {
  if (isMermaidFile(fileName)) return "mermaid";
  if (isMindmapFile(fileName)) return "mindmap";
  if (isMarkdownFile(fileName)) return "markdown";
  if (isHtmlFile(fileName)) return "html";
  return "plain";
}

// ── Display mode type ───────────────────────────────────────────────────────

export type LCFileViewDisplayMode = "source" | "file";

// ── Props ───────────────────────────────────────────────────────────────────

export interface LCFileViewDisplayModeProps {
  /** Current display mode */
  displayMode: LCFileViewDisplayMode;
  /** The currently selected file (must be non-null) */
  selectedFile: LCFileTreeItem;
  /** Raw file content */
  content: string;
  /** Called when the Monaco editor content changes */
  onContentChange: (content: string) => void;
  /** Save the file */
  onSave: () => void;
  /** Insert text into the chat input (Monaco context menu action) */
  onInsertToChatInput?: (text: string) => void;
  /** Whether to wrap lines in the Monaco editor */
  wordWrap?: boolean;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function LCFileViewDisplayMode({
  displayMode,
  selectedFile,
  content,
  onContentChange,
  onSave,
  onInsertToChatInput,
  wordWrap = true,
}: LCFileViewDisplayModeProps) {
  // Register built-in render adapters once at mount
  useEffect(() => {
    registerBuiltinAdapters();
  }, []);

  // ── Refs to keep Monaco's onMount closures non-stale ──────────────
  // Monaco's onMount callback fires only once per editor lifetime.
  // If we reference onSave / onInsertToChatInput / selectedFile directly,
  // the closure captures their values at mount time — which become stale
  // after the user types (triggering re-renders that create new callbacks).
  // By routing through refs that are kept in sync every render, Ctrl+S
  // and the context-menu action always read the LATEST values.
  const onSaveRef = useRef(onSave);
  const onInsertToChatInputRef = useRef(onInsertToChatInput);
  const selectedFileRef = useRef(selectedFile);
  onSaveRef.current = onSave;
  onInsertToChatInputRef.current = onInsertToChatInput;
  selectedFileRef.current = selectedFile;

  // ── Editor ref for uncontrolled Monaco pattern ──────────────────
  // Instead of passing `value={content}` (which causes cursor jumps on
  // every keystroke re-render), we use an uncontrolled pattern: set initial
  // content via `defaultValue`, then sync external changes only when they
  // actually differ from the editor's current content.
  const editorRef = useRef<any>(null);

  // ── Sync external content changes (file reload, file switch) ──
  // When the user switches files or reloads from disk, the content prop
  // changes but the key={selectedFile.path} may not trigger a remount
  // in all cases. This effect compares the editor's current value against
  // the prop and only calls setValue when they actually differ, preserving
  // cursor position during normal typing.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const currentValue = editor.getValue();
    if (currentValue !== content) {
      editor.setValue(content);
    }
  }, [content]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {displayMode === "file" && canPreviewFile(selectedFile.name) ? (
        /* ── Render Module Preview (markdown, mermaid, mindmap, html) ─── */
        <RenderView
          format={getRenderFormat(selectedFile.name)}
          content={content}
          className="flex-1 min-h-0"
        />
      ) : (
        /* ── Monaco Editor (default for source mode or non-previewable files) ── */
        <MonacoEditor
          key={selectedFile.path}
          height="100%"
          language={getLanguage(selectedFile.name)}
          defaultValue={content}
          onChange={(val) => onContentChange(val || "")}
          onMount={(editor, monaco) => {
            editorRef.current = editor;
            // Use refs to always invoke the LATEST callbacks / read the
            // latest selectedFile — the onMount closure would otherwise
            // capture stale references that don't reflect subsequent edits.
            editor.addCommand(
              monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
              () => onSaveRef.current(),
            );

            // Add context menu action: "Add Selection as Code Block to Chat"
            const insertToChat = onInsertToChatInputRef.current;
            if (insertToChat) {
              editor.addAction({
                id: "lc-add-selection-as-code-block",
                label: "Add Selection as Code Block to Chat",
                contextMenuGroupId: "modification",
                contextMenuOrder: 1.5,
                run: (ed) => {
                  const selection = ed.getSelection();
                  if (!selection) return;
                  const model = ed.getModel();
                  if (!model) return;
                  const selectedText = model.getValueInRange(selection);
                  if (!selectedText) return;
                  const language = getLanguage(selectedFileRef.current?.name || "");
                  const codeBlock = `\`\`\`${language}\n${selectedText}\n\`\`\``;
                  insertToChat(codeBlock);
                },
              });
            }
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
            wordWrap: wordWrap ? "on" : "off",
          }}
        />
      )}
    </div>
  );
}
