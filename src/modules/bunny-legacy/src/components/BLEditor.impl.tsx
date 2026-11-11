"use client";

import {
  MDXEditor,
  type MDXEditorMethods,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  tablePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  ListsToggle,
  Separator,
  CreateLink,
  InsertTable,
  CodeToggle,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { useCallback, useEffect, useRef, type RefObject } from "react";

export interface IBLEditorProps {
  markdown: string;
  onChange?: (markdown: string) => void;
  readOnly?: boolean;
  minHeight?: string;
  placeholder?: string;
}

const PLUGINS = [
  // Basic Formatting
  headingsPlugin(),
  listsPlugin(),
  quotePlugin(),
  thematicBreakPlugin(),
  // Links & Tables
  linkPlugin(),
  linkDialogPlugin(),
  tablePlugin(),
  // Code handling
  codeBlockPlugin({ defaultCodeBlockLanguage: "ts" }),
  codeMirrorPlugin({
    codeBlockLanguages: {
      js: "JS",
      ts: "TS",
      css: "CSS",
      html: "HTML",
    },
  }),
  // Shortcuts (e.g. typing '#' creates h1)
  markdownShortcutPlugin(),
  // The Toolbar
  toolbarPlugin({
    toolbarContents: () => (
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-50 dark:bg-slate-900 border-b">
        <UndoRedo />
        <Separator />
        <BoldItalicUnderlineToggles />
        <Separator />
        <ListsToggle />
        <Separator />
        <CreateLink />
        <InsertTable />
        <CodeToggle />
      </div>
    ),
  }),
];

interface BLEditorImplProps extends IBLEditorProps {
  editorRef: RefObject<MDXEditorMethods | null>;
}

export default function BLEditorImpl({
  markdown,
  onChange,
  readOnly,
  minHeight = "150px",
  placeholder,
  editorRef,
}: BLEditorImplProps) {
  const lastPropRef = useRef(markdown);
  const lastEmittedRef = useRef(markdown);

  const handleChange = useCallback(
    (next: string) => {
      lastEmittedRef.current = next;
      onChange?.(next);
    },
    [onChange],
  );

  useEffect(() => {
    if (markdown === lastPropRef.current) return;
    lastPropRef.current = markdown;
    if (markdown === lastEmittedRef.current) return;
    if (editorRef.current?.getMarkdown() === markdown) return;
    editorRef.current?.setMarkdown(markdown);
  }, [markdown, editorRef]);

  return (
    <div
      className="border rounded-md bg-white dark:bg-slate-950 overflow-hidden"
      style={{ minHeight }}
    >
      <MDXEditor
        ref={editorRef}
        markdown={markdown}
        onChange={handleChange}
        readOnly={readOnly}
        contentEditableClassName="prose dark:prose-invert max-w-none min-h-[200px] p-4 focus:outline-none"
        placeholder={placeholder ?? "Write your content in markdown..."}
        plugins={PLUGINS}
      />
    </div>
  );
}
