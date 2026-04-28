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
  type MDXEditorProps,
  CodeToggle,
} from "@mdxeditor/editor";
import { FC, forwardRef } from "react";

// interface EditorProps {
//   markdown: string;
//   onChange?: (markdown: string) => void;
//   readOnly?: boolean;
// }

/**
 * A robust, full-featured MDX Editor component.
 */
const BookBuilderEditor = forwardRef<MDXEditorMethods, MDXEditorProps>(
  (props, ref) => {
    const { markdown, onChange, readOnly } = props;

    return (
      <div className="border rounded-md bg-white dark:bg-slate-950 overflow-hidden">
        <MDXEditor
          ref={ref}
          markdown={markdown}
          onChange={onChange}
          readOnly={readOnly}
          contentEditableClassName="prose dark:prose-invert max-w-none min-h-[250px] p-4 focus:outline-none"
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

BookBuilderEditor.displayName = "BookBuilderEditor";

export default BookBuilderEditor;
