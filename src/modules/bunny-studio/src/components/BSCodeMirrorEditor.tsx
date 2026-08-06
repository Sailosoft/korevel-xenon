// BSCodeMirrorEditor — Reusable CodeMirror 6 editor for Bunny AI Studio.
//
// Used by the chat input (codemirror mode) and by the "open in editor" modal.
// SSR-safe (client-only mount) with JS/JSON/YAML language support and the
// one-dark theme.

"use client";

import React, { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { yaml } from "@codemirror/lang-yaml";
import { oneDark } from "@codemirror/theme-one-dark";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";

// ─── Props ─────────────────────────────────────────────────────────────

export interface BSCodeMirrorEditorProps {
  /** Current document content */
  value: string;
  /** Called when the document changes (ignored when readOnly) */
  onChange?: (value: string) => void;
  /** When true the editor is read-only */
  readOnly?: boolean;
  /** Editor height (number = px, string = CSS) */
  height?: number | string;
  /** Extra className for the wrapper */
  className?: string;
}

// ─── Component ─────────────────────────────────────────────────────────

export function BSCodeMirrorEditor({
  value,
  onChange,
  readOnly = false,
  height = 120,
  className = "",
}: BSCodeMirrorEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current?.(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        javascript(),
        json(),
        yaml(),
        oneDark,
        updateListener,
        keymap.of([indentWithTab]),
        EditorView.editable.of(!readOnly),
        EditorState.readOnly.of(readOnly),
        EditorView.editorAttributes.of({
          class: "bs-cm-editor",
        }),
        EditorView.theme({
          "&": { fontSize: "13px", height: "100%" },
          ".cm-scroller": {
            fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
          },
          ".cm-content": { caretColor: "#a855f7" },
          "&.cm-focused .cm-cursor": { borderLeftColor: "#a855f7" },
        }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly]);

  // Keep the editor in sync with the `value` prop (controlled behaviour).
  // Without this, external updates — e.g. a second editor bound to the same
  // state (the chat input behind the modal) — never reach this editor.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
    });
  }, [value]);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto bg-[#282c34] ${className}`}
      style={{ height }}
    />
  );
}

export default BSCodeMirrorEditor;
