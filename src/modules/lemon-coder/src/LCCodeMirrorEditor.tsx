"use client";

import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { xml } from "@codemirror/lang-xml";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";

function resolveLanguage(lang: string) {
  switch (lang) {
    case "typescript":
    case "javascript":
      return javascript();
    case "json":
      return json();
    case "css":
    case "scss":
      return css();
    case "html":
      return html();
    case "markdown":
      return markdown();
    case "python":
      return python();
    case "xml":
      return xml();
    default:
      return [];
  }
}

export interface LCCodeMirrorEditorProps {
  content: string;
  onChange: (value: string) => void;
  language: string;
  wordWrap?: boolean;
  fontSize?: number;
  tabSize?: number;
  onSave?: () => void;
}

export default function LCCodeMirrorEditor({
  content,
  onChange,
  language,
  wordWrap = true,
  fontSize = 13,
  tabSize = 2,
  onSave,
}: LCCodeMirrorEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  const isInitialSyncRef = useRef(true);

  useEffect(() => {
    onChangeRef.current = onChange;
    onSaveRef.current = onSave;
  });

  useEffect(() => {
    if (!containerRef.current) return;

    isInitialSyncRef.current = true;

    const langExt = resolveLanguage(language);

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
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
      doc: content,
      extensions: [
        basicSetup,
        oneDark,
        langExt,
        updateListener,
        extraKeymap,
        EditorView.editorAttributes.of({ class: "cm-lemon-coder" }),
        EditorView.theme({
          "&": { fontSize: `${fontSize}px`, height: "100%" },
          ".cm-scroller": { fontFamily: '"JetBrains Mono", "Fira Code", monospace' },
          ".cm-content": { caretColor: "#e5c07b" },
          "&.cm-focused .cm-cursor": { borderLeftColor: "#e5c07b" },
          ".cm-selectionBackground, .cm-focused .cm-selectionBackground": {
            backgroundColor: "#3a3a3a !important",
          },
          ".cm-activeLine": { backgroundColor: "#2a2a2a" },
          ".cm-gutters": {
            backgroundColor: "#1e1e1e",
            color: "#858585",
            border: "none",
          },
          ".cm-lineNumbers .cm-activeLineGutter": {
            backgroundColor: "#2a2a2a",
            color: "#e5c07b",
          },
        }),
        wordWrap ? EditorView.lineWrapping : [],
        EditorState.tabSize.of(tabSize),
      ],
    });

    viewRef.current?.destroy();
    viewRef.current = new EditorView({
      state,
      parent: containerRef.current,
    });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
    // content is intentionally excluded — synced via the dedicated effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, wordWrap, fontSize, tabSize]);

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
      className="flex-1 overflow-auto"
      style={{ height: "100%" }}
    />
  );
}
