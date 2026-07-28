"use client";

import {
  MDXEditor,
  MDXEditorMethods,
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
import { forwardRef, useEffect, useRef } from "react";

export interface IBLEditorProps {
  markdown: string;
  onChange?: (markdown: string) => void;
  readOnly?: boolean;
  minHeight?: string;
  placeholder?: string;
}

/**
 * BLEditor - A lightweight MDX/Markdown editor for bunny-legacy.
 * Based on BookBuilderEditor but with a simplified interface.
 *
 * Uses an internal ref + useEffect to sync the markdown prop into the editor,
 * because MDXEditor treats the `markdown` prop as an initial value only
 * (uncontrolled). Without this sync, switching between books would show
 * stale content in the editor.
 */
const BLEditor = forwardRef<MDXEditorMethods, IBLEditorProps>(
  ({ markdown, onChange, readOnly, minHeight = "150px" }, externalRef) => {
    const internalRef = useRef<MDXEditorMethods | null>(null);
    const editorRef = (externalRef ?? internalRef) as React.RefObject<MDXEditorMethods | null>;

    // Sync the markdown prop into the editor whenever it changes,
    // because MDXEditor only uses the initial value.
    useEffect(() => {
      if (editorRef.current) {
        editorRef.current.setMarkdown(markdown);
      }
    }, [markdown, editorRef]);

    return (
      <div
        className="border rounded-md bg-white dark:bg-slate-950 overflow-hidden"
        style={{ minHeight }}
      >
        <MDXEditor
          ref={editorRef}
          markdown={markdown}
          onChange={onChange}
          readOnly={readOnly}
          contentEditableClassName="prose dark:prose-invert max-w-none min-h-[200px] p-4 focus:outline-none"
          placeholder="Write your content in markdown..."
          plugins={[
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
          ]}
        />
      </div>
    );
  },
);

BLEditor.displayName = "BLEditor";

export default BLEditor;
