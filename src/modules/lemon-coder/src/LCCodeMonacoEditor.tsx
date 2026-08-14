"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";

// ── Dynamically import Monaco to avoid SSR issues ─────────────────────────
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

export interface LCCodeMonacoEditorProps {
  /** Raw file content — used as the initial value and as the source for external syncs */
  content: string;
  /** Called whenever the editor content changes (user typing) */
  onChange: (value: string) => void;
  /** Monaco language id (e.g. "typescript") */
  language: string;
  /** Wrap long lines */
  wordWrap?: boolean;
  /** Editor font size in px */
  fontSize?: number;
  /** Tab size in spaces */
  tabSize?: number;
  /** Invoked on Ctrl+S / Cmd+S */
  onSave?: () => void;
  /** Insert text (e.g. a code block) into the chat input via the context menu */
  onInsertToChatInput?: (text: string) => void;
  /** Key that forces a fresh editor instance when the file changes */
  fileKey?: string;
}

export default function LCCodeMonacoEditor({
  content,
  onChange,
  language,
  wordWrap = true,
  fontSize = 13,
  tabSize = 2,
  onSave,
  onInsertToChatInput,
  fileKey,
}: LCCodeMonacoEditorProps) {
  // ── Refs to keep Monaco's onMount closures non-stale ──────────────────────
  // Monaco's onMount fires only once per editor lifetime. Routing every
  // callback/value through refs kept in sync on each render means Ctrl+S and
  // the context-menu action always read the LATEST props, even after the
  // re-renders caused by typing.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  const onInsertToChatInputRef = useRef(onInsertToChatInput);
  const languageRef = useRef(language);
  /**
   * The most recent value this editor pushed upward via onChange. Lets us
   * distinguish "echo of our own typing" (which must NEVER be written back)
   * from a genuine external content update (file reload / switch) that needs
   * editor.setValue(). Writing back the echo is what reset the cursor to the
   * top of the file while typing continuously.
   */
  const lastReportedContentRef = useRef<string | null>(null);
  /**
   * Debounced timer used to apply a genuine external content update (e.g.
   * Reload from Disk). It is cancelled whenever a typing echo arrives, so it
   * can never land in the middle of a fast typing burst (which would delete
   * the newest keystrokes and jump the cursor).
   */
  const externalSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep refs in sync every render so closures never capture stale props.
  useEffect(() => {
    onChangeRef.current = onChange;
    onSaveRef.current = onSave;
    onInsertToChatInputRef.current = onInsertToChatInput;
    languageRef.current = language;
  });

  /**
   * Reset per-file editor tracking when the user switches files.
   * The inner MonacoEditor remounts (key={fileKey}) but THIS component — and
   * its refs — do NOT, so a stale `lastReportedContentRef` (echo of the
   * previous file) or a pending external sync could otherwise mask a genuine
   * content update for the newly opened file.
   */
  const previousFileKeyRef = useRef(fileKey);
  useEffect(() => {
    if (externalSyncTimerRef.current) {
      clearTimeout(externalSyncTimerRef.current);
      externalSyncTimerRef.current = null;
    }
    if (previousFileKeyRef.current !== fileKey) {
      lastReportedContentRef.current = null;
      previousFileKeyRef.current = fileKey;
    }
  }, [fileKey]);

  // ── Sync genuine external content changes WITHOUT clobbering the cursor ───
  // The editor is uncontrolled (defaultValue), so content is re-applied only
  // here. Writing the parent's content back to the editor is safe ONLY for a
  // genuine external update (e.g. Reload from Disk). Two mechanisms keep fast
  // typing safe:
  //   1) Echo detection — if `content` is the echo of our own last onChange,
  //      or a strict prefix of the editor's text (keystrokes that haven't
  //      reached the parent yet), we skip it. Otherwise setValue would delete
  //      the trailing keystrokes and jump the cursor to (0,0).
  //   2) Debounced apply — a real external sync is scheduled ~150ms out and
  //      cancelled by any intervening typing echo, so it can never land mid-
  //      burst. Cursor + scroll are restored afterwards so even a genuine
  //      reload doesn't yank the viewport.
  useEffect(() => {
    // Any content change invalidates a previously scheduled external sync.
    if (externalSyncTimerRef.current) {
      clearTimeout(externalSyncTimerRef.current);
      externalSyncTimerRef.current = null;
    }

    const editor = editorRef.current;
    // A disposed editor (mid file-switch remount) reports a null model — skip.
    if (!editor || !editor.getModel()) return;
    const currentValue = editor.getValue();

    // Already in sync — the normal typing echo case.
    if (currentValue === content) return;

    // Editor is strictly ahead of the incoming content (content is a prefix of
    // the editor's text). This only means "the newest keystrokes haven't reached
    // the parent yet" when the editor itself pushed this exact text upward
    // (lastReportedContentRef === currentValue). Otherwise it is a genuine
    // external update (file switch / reload / new file) that MUST be applied —
    // e.g. opening a new empty file while a longer file is open would otherwise
    // keep showing the previous file's content forever.
    const editorPushedThisText = lastReportedContentRef.current === currentValue;
    if (
      editorPushedThisText &&
      currentValue.length > content.length &&
      currentValue.startsWith(content)
    ) {
      return;
    }

    // The incoming content matches what THIS editor last reported — it's an
    // echo of our own edit, so the editor is the source of truth. Skip.
    if (lastReportedContentRef.current === content) return;

    // Genuine external change (Reload from Disk, etc.). Apply it shortly, but
    // only if the editor hasn't been edited in the meantime (which would mean
    // the content was merely catching up).
    const target = content;
    const valueAtSchedule = currentValue;
    externalSyncTimerRef.current = setTimeout(() => {
      const ed = editorRef.current;
      if (!ed || !ed.getModel()) return;
      // Editor changed since we scheduled — abort; the newer echo will win.
      if (ed.getValue() !== valueAtSchedule) return;
      const position = ed.getPosition();
      const scrollTop = ed.getScrollTop();
      ed.setValue(target);
      lastReportedContentRef.current = target;
      if (position) ed.setPosition(position);
      ed.setScrollTop(scrollTop);
      externalSyncTimerRef.current = null;
    }, 150);
  }, [content]);

  // Clear any pending external sync on unmount.
  useEffect(() => {
    return () => {
      if (externalSyncTimerRef.current) {
        clearTimeout(externalSyncTimerRef.current);
        externalSyncTimerRef.current = null;
      }
    };
  }, []);

  return (
    <MonacoEditor
      key={fileKey}
      height="100%"
      language={language}
      defaultValue={content}
      onChange={(val) => {
        const value = val || "";
        // Remember what the editor pushed so the sync effect can tell this
        // echo apart from a genuine external update.
        lastReportedContentRef.current = value;
        onChangeRef.current(value);
      }}
      onMount={(editor, monaco) => {
        editorRef.current = editor;

        // Ctrl+S / Cmd+S
        editor.addCommand(
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
          () => onSaveRef.current?.(),
        );

        // Context menu action: "Add Selection as Code Block to Chat"
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
              const codeBlock = `\`\`\`${languageRef.current}\n${selectedText}\n\`\`\``;
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
        fontSize,
        lineNumbers: "on",
        renderWhitespace: "selection",
        tabSize,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 8 },
        wordWrap: wordWrap ? "on" : "off",
      }}
    />
  );
}
