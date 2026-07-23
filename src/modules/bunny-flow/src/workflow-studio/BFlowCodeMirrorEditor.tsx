/**
 * BFlowCodeMirrorEditor — CodeMirror-based YAML editor for the workflow studio.
 *
 * Provides a lightweight alternative to MonacoEditor with basic YAML syntax
 * highlighting, line numbers, and configurable editor options.
 *
 * Uses the same CodeMirror 6 stack as LCCodeMirrorEditor (lemon-coder) but
 * specialised for YAML editing with a light theme suitable for the studio.
 */

"use client";

import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { yaml } from "@codemirror/lang-yaml";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";

// ─── Props ────────────────────────────────────────────────────────────

export interface BFlowCodeMirrorEditorProps {
  /** The YAML content to display/edit. */
  value: string;
  /** Called whenever the content changes. */
  onChange: (value: string) => void;
  /** Optional save callback (Ctrl+S). */
  onSave?: () => void;
  /** Font size in pixels. Defaults to 13. */
  fontSize?: number;
  /** Tab size (spaces). Defaults to 2. */
  tabSize?: number;
  /** Whether to wrap long lines. Defaults to true. */
  wordWrap?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────

export default function BFlowCodeMirrorEditor({
  value,
  onChange,
  onSave,
  fontSize = 13,
  tabSize = 2,
  wordWrap = true,
}: BFlowCodeMirrorEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  const isInitialSyncRef = useRef(true);

  // Keep callback refs up to date
  useEffect(() => {
    onChangeRef.current = onChange;
    onSaveRef.current = onSave;
  });

  // ── Create / recreate editor instance when options change ──────────
  useEffect(() => {
    if (!containerRef.current) return;

    isInitialSyncRef.current = true;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        // Skip the initial sync — we set the doc via `value` prop
        if (isInitialSyncRef.current) {
          isInitialSyncRef.current = false;
          return;
        }
        onChangeRef.current(update.state.doc.toString());
      }
    });

    const extraKeymap = keymap.of([
      { key: "Mod-s", run: () => { onSaveRef.current?.(); return true; } },
      indentWithTab,
    ]);

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        yaml(),
        updateListener,
        extraKeymap,
        EditorView.editorAttributes.of({
          class: "cm-bflow-studio",
        }),
        EditorView.theme({
          "&": {
            fontSize: `${fontSize}px`,
            height: "100%",
          },
          ".cm-scroller": {
            fontFamily:
              '"JetBrains Mono", "Fira Code", "Consolas", monospace',
          },
          ".cm-content": {
            caretColor: "#2563eb",
          },
          "&.cm-focused .cm-cursor": {
            borderLeftColor: "#2563eb",
          },
          ".cm-selectionBackground, .cm-focused .cm-selectionBackground": {
            backgroundColor: "#bfdbfe !important",
          },
          ".cm-activeLine": {
            backgroundColor: "#f1f5f9",
          },
          ".cm-gutters": {
            backgroundColor: "#f8fafc",
            color: "#94a3b8",
            border: "none",
            borderRight: "1px solid #e2e8f0",
          },
          ".cm-lineNumbers .cm-activeLineGutter": {
            backgroundColor: "#e2e8f0",
            color: "#334155",
          },
          ".cm-foldPlaceholder": {
            backgroundColor: "#f1f5f9",
            color: "#64748b",
          },
        }),
        wordWrap ? EditorView.lineWrapping : [],
        EditorState.tabSize.of(tabSize),
      ],
    });

    // Destroy previous instance
    viewRef.current?.destroy();
    viewRef.current = new EditorView({
      state,
      parent: containerRef.current,
    });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
    // `value` is intentionally excluded — synced via the dedicated effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontSize, tabSize, wordWrap]);

  // ── Sync external value changes into the editor ────────────────────
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (currentDoc !== value) {
      isInitialSyncRef.current = true;
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto"
      style={{ height: "100%" }}
    />
  );
}
