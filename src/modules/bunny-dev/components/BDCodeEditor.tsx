"use client";

// BDCodeEditor — CodeMirror 6 editor with optional language support.
//
// SSR-safe: the EditorView is created inside an effect, so nothing touches the
// DOM during server rendering.

import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { yaml } from "@codemirror/lang-yaml";
import { css } from "@codemirror/lang-css";
import { oneDark } from "@codemirror/theme-one-dark";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { cn } from "@heroui/react";

export interface BDCodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: "javascript" | "typescript" | "json" | "yaml" | "css" | "text";
  readOnly?: boolean;
  height?: number | string;
  className?: string;
}

function languageExtension(language: BDCodeEditorProps["language"]) {
  switch (language) {
    case "javascript":
      return javascript();
    case "typescript":
      return javascript({ typescript: true });
    case "json":
      return json();
    case "yaml":
      return yaml();
    case "css":
      return css();
    default:
      return [];
  }
}

export function BDCodeEditor({
  value,
  onChange,
  language = "text",
  readOnly = false,
  height = 240,
  className,
}: BDCodeEditorProps) {
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
        languageExtension(language),
        oneDark,
        updateListener,
        keymap.of([indentWithTab]),
        EditorState.readOnly.of(readOnly),
        EditorView.editable.of(!readOnly),
        EditorView.theme({
          "&": { fontSize: "13px", height: "100%" },
          ".cm-scroller": {
            fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
          },
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
  }, [language, readOnly]);

  // Keep the editor in sync when `value` changes externally.
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
      className={cn("overflow-auto rounded-lg bg-[#282c34]", className)}
      style={{ height }}
    />
  );
}

export default BDCodeEditor;
