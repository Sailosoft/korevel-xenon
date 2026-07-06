// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCFileView.DisplayMode Sub-Component
// Renders file content based on display mode: Monaco editor for source,
// ReactMarkdown for .md files, MermaidRenderer for .mermaid/.mmd files.
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MermaidRenderer from "@/src/modules/bunny-thinker/src/components/MermaidRenderer";
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
  return getFileExt(fileName) === "md";
}

export function isMermaidFile(fileName: string): boolean {
  const ext = getFileExt(fileName);
  return ext === "mermaid" || ext === "mmd";
}

export function canPreviewFile(fileName: string): boolean {
  return isMarkdownFile(fileName) || isMermaidFile(fileName);
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
}

// ── Component ───────────────────────────────────────────────────────────────

export default function LCFileViewDisplayMode({
  displayMode,
  selectedFile,
  content,
  onContentChange,
  onSave,
  onInsertToChatInput,
}: LCFileViewDisplayModeProps) {
  const mdFile = isMarkdownFile(selectedFile.name);
  const mmdFile = isMermaidFile(selectedFile.name);

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

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {displayMode === "file" && mdFile ? (
        /* ── Rendered Markdown Preview ───────────────────────────── */
        <div
          className="flex-1 overflow-y-auto p-6"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#555 transparent",
          } as React.CSSProperties}
        >
          <div className="text-[#d4d4d4] text-sm leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-xl font-bold text-[#e5c07b] mt-6 mb-3 pb-1 border-b border-[#333333]">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-lg font-bold text-[#e5c07b] mt-5 mb-2">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-base font-semibold text-[#d4d4d4] mt-4 mb-1">
                    {children}
                  </h3>
                ),
                h4: ({ children }) => (
                  <h4 className="text-sm font-semibold text-[#d4d4d4] mt-3 mb-1">
                    {children}
                  </h4>
                ),
                p: ({ children }) => (
                  <p className="my-2 text-[#d4d4d4]">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-6 my-2 text-[#d4d4d4]">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-6 my-2 text-[#d4d4d4]">{children}</ol>
                ),
                code: ({ className, children, ...props }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className="bg-[#2d2d2d] text-[#e06c75] px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                      {children}
                    </code>
                  ) : (
                    <code className="block bg-[#1a1a1a] text-[#abb2bf] p-3 rounded-lg text-xs font-mono overflow-x-auto my-3 border border-[#333333]" {...props}>
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => (
                  <pre className="bg-transparent p-0 m-0 overflow-x-auto">{children}</pre>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-[#e5c07b] pl-4 my-3 italic text-[#858585]">
                    {children}
                  </blockquote>
                ),
                a: ({ href, children }) => (
                  <a href={href} className="text-[#61afef] hover:underline" target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                ),
                hr: () => <hr className="border-[#333333] my-4" />,
                table: ({ children }) => (
                  <div className="overflow-x-auto my-3">
                    <table className="min-w-full border-collapse border border-[#333333] text-sm">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-[#333333] bg-[#2d2d2d] text-[#e5c07b] px-3 py-1.5 font-semibold text-left">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-[#333333] px-3 py-1.5 text-[#d4d4d4]">
                    {children}
                  </td>
                ),
                img: ({ src, alt }) => (
                  <img src={src} alt={alt || ""} className="max-w-full rounded-lg my-3" />
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
      ) : displayMode === "file" && mmdFile ? (
        /* ── Mermaid Diagram Preview ─────────────────────────────── */
        <div className="flex items-start justify-center h-full p-4 overflow-y-auto">
          <MermaidRenderer
            chart={content}
            className="w-full max-w-full"
          />
        </div>
      ) : (
        /* ── Monaco Editor (default for source mode or non-previewable files) ── */
        <MonacoEditor
          key={selectedFile.path}
          height="100%"
          language={getLanguage(selectedFile.name)}
          value={content}
          onChange={(val) => onContentChange(val || "")}
          onMount={(editor, monaco) => {
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
          }}
        />
      )}
    </div>
  );
}
