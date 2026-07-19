// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCFileView.DisplayMode Sub-Component
// Renders file content based on display mode: Monaco editor for source,
// or the Render Module's RenderView for previewable files (markdown, mermaid,
// mindmap, html, etc.).
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { RenderView, registerBuiltinAdapters } from "@/src/modules/render";
import type { RenderFormat, RenderTableColors } from "@/src/modules/render";
import type { LCFileTreeItem } from "./LCInterface";
import type { Components } from "react-markdown";

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

// ── Lemon Coder table colours (CSV preview) ───────────────────────────────────

const lemonCoderTableColors: RenderTableColors = {
  headerBackground: "#2d2d2d",
  headerColor: "#e5c07b",
  border: "#444444",
  cellColor: "#d4d4d4",
  rowAlternateBackground: "#1a1a1a",
};

// ── Lemon Coder markdown theme (dark code-editor aesthetic) ──────────────────

const lemonCoderMarkdownComponentsBase: Components = {
  h1: ({ children, ...props }) => (
    <h1 {...props} style={{
      fontSize: "1.25rem",
      fontWeight: 700,
      color: "#e5c07b",
      marginTop: "1.5rem",
      marginBottom: "0.75rem",
      paddingBottom: "0.25rem",
      borderBottom: "1px solid #333333",
    }}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 {...props} style={{ fontSize: "1.1rem", fontWeight: 700, color: "#e5c07b", marginTop: "1.25rem", marginBottom: "0.5rem" }}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 {...props} style={{ fontSize: "1rem", fontWeight: 600, color: "#d4d4d4", marginTop: "1rem", marginBottom: "0.25rem" }}>
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4 {...props} style={{ fontSize: "0.9rem", fontWeight: 600, color: "#d4d4d4", marginTop: "0.75rem", marginBottom: "0.25rem" }}>
      {children}
    </h4>
  ),
  p: ({ children, ...props }) => (
    <p {...props} style={{ margin: "0.5rem 0", color: "#d4d4d4", lineHeight: 1.7 }}>{children}</p>
  ),
  ul: ({ children, ...props }) => (
    <ul {...props} style={{ listStyle: "disc", paddingLeft: "1.5rem", margin: "0.5rem 0", color: "#d4d4d4" }}>{children}</ul>
  ),
  ol: ({ children, ...props }) => (
    <ol {...props} style={{ listStyle: "decimal", paddingLeft: "1.5rem", margin: "0.5rem 0", color: "#d4d4d4" }}>{children}</ol>
  ),
  code: ({ className, children, ...props }) => {
    const isInline = !className;
    return isInline ? (
      <code {...props} style={{
        background: "#2d2d2d",
        color: "#e06c75",
        padding: "0.125rem 0.375rem",
        borderRadius: "4px",
        fontSize: "0.75rem",
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      }}>
        {children}
      </code>
    ) : (
      <code {...props} style={{
        display: "block",
        background: "#1a1a1a",
        color: "#abb2bf",
        padding: "0.75rem",
        borderRadius: "8px",
        fontSize: "0.75rem",
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        overflowX: "auto",
        margin: "0.75rem 0",
        border: "1px solid #333333",
      }}>
        {children}
      </code>
    );
  },
};

function LemonCoderPreWithCopy({ children, ...props }: React.ComponentPropsWithoutRef<"pre">) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (preRef.current) {
      const text = preRef.current.textContent || "";
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Clipboard write failed — silently ignore
      }
    }
  }, []);

  return (
    <div style={{ position: "relative", margin: "0.75rem 0" }}>
      <button
        onClick={handleCopy}
        title="Copy code block"
        style={{
          position: "absolute",
          top: "0.5rem",
          right: "0.5rem",
          zIndex: 1,
          background: "#2d2d2d",
          border: "1px solid #444444",
          borderRadius: "4px",
          color: copied ? "#98c379" : "#858585",
          padding: "0.2rem 0.5rem",
          fontSize: "0.7rem",
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          cursor: "pointer",
          opacity: 0.6,
          transition: "opacity 0.15s, color 0.15s",
          lineHeight: 1.4,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.6"; }}
      >
        {copied ? "Copied!" : "Copy"}
      </button>
      <pre
        ref={preRef}
        {...props}
        style={{ background: "transparent", padding: 0, margin: 0, overflowX: "auto" }}
      >
        {children}
      </pre>
    </div>
  );
}

const lemonCoderMarkdownComponents: Components = {
  ...lemonCoderMarkdownComponentsBase,
  pre: LemonCoderPreWithCopy,
  blockquote: ({ children, ...props }) => (
    <blockquote {...props} style={{
      borderLeft: "4px solid #e5c07b",
      paddingLeft: "1rem",
      margin: "0.75rem 0",
      fontStyle: "italic",
      color: "#858585",
    }}>
      {children}
    </blockquote>
  ),
  a: ({ href, children, ...props }) => (
    <a href={href} {...props} style={{ color: "#61afef", textDecoration: "none" }} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  hr: (props) => <hr {...props} style={{ border: "none", borderTop: "1px solid #333333", margin: "1rem 0" }} />,
  table: ({ children, ...props }) => (
    <div style={{ overflowX: "auto", margin: "0.75rem 0" }}>
      <table {...props} style={{ minWidth: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>{children}</table>
    </div>
  ),
  th: ({ children, ...props }) => (
    <th {...props} style={{
      border: "1px solid #333333",
      background: "#2d2d2d",
      color: "#e5c07b",
      padding: "0.375rem 0.75rem",
      fontWeight: 600,
      textAlign: "left",
    }}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td {...props} style={{ border: "1px solid #333333", padding: "0.375rem 0.75rem", color: "#d4d4d4" }}>{children}</td>
  ),
};

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
          markdownComponents={lemonCoderMarkdownComponents}
          tableColors={lemonCoderTableColors}
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
