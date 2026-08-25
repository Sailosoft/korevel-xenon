"use client";

// ───────────────────────────────────────────────────────────────────────────────
// Render Module — YAML CodeMirror Viewer
//
// A read-only CodeMirror 6 component for displaying YAML content with
// syntax highlighting, line numbers, and folding.
//
// Uses the locally-bundled CodeMirror 6 packages (no CDN dependency), making
// it lightweight and reliable inside modals, popovers, and flex layouts where
// Monaco previously failed to size/load correctly.
// ───────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { yaml } from "@codemirror/lang-yaml";

// ── Props ────────────────────────────────────────────────────────────────────

export interface YamlCodeMirrorViewerProps {
  /** The YAML content to display */
  content: string;
  /** Optional CSS class name */
  className?: string;
  /** Whether the editor is read-only (default: true) */
  readOnly?: boolean;
}

// ── Light theme matching the RenderView surface ───────────────────────────────

const yamlViewerTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "13px",
    backgroundColor: "#ffffff",
    color: "#1f2937",
  },
  ".cm-scroller": {
    fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
    lineHeight: "1.6",
  },
  ".cm-content": {
    padding: "0.75rem 0",
    caretColor: "transparent",
  },
  ".cm-gutters": {
    backgroundColor: "#f8fafc",
    color: "#94a3b8",
    border: "none",
    borderRight: "1px solid #e2e8f0",
  },
  ".cm-activeLine": {
    backgroundColor: "transparent",
  },
  ".cm-lineNumbers .cm-activeLineGutter": {
    backgroundColor: "transparent",
    color: "#334155",
  },
  ".cm-selectionBackground, .cm-focused .cm-selectionBackground": {
    backgroundColor: "#dbeafe !important",
  },
  ".cm-foldPlaceholder": {
    backgroundColor: "#f1f5f9",
    color: "#64748b",
  },
  "&.cm-focused": {
    outline: "none",
  },
});

// ── Component ────────────────────────────────────────────────────────────────

/**
 * YamlCodeMirrorViewer — a read-only CodeMirror 6 editor pre-configured for YAML.
 *
 * Features:
 * - Syntax highlighting for YAML (via @codemirror/lang-yaml)
 * - Line numbers and folding
 * - Auto word-wrap
 * - Read-only by default
 */
export function YamlCodeMirrorViewer({
  content,
  className,
  readOnly = true,
}: YamlCodeMirrorViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  // ── Create the CodeMirror instance ─────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: content,
      extensions: [
        basicSetup,
        yaml(),
        EditorView.editable.of(readOnly),
        EditorView.lineWrapping,
        yamlViewerTheme,
      ],
    });

    // Destroy previous instance before creating a new one
    viewRef.current?.destroy();
    viewRef.current = new EditorView({
      state,
      parent: containerRef.current,
    });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
    // `content` is intentionally excluded — synced via the dedicated effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly]);

  // ── Sync external content changes into the viewer ──────────────────────────
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (currentDoc !== content) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: content },
      });
    }
  }, [content]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        background: "#ffffff",
      }}
    />
  );
}
