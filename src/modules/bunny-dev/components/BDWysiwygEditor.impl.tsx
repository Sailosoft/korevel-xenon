"use client";

// BDWysiwygEditor.impl — MDXEditor-based markdown WYSIWYG.
//
// Loaded only on the client by the BDWysiwygEditor wrapper (`dynamic`,
// `ssr: false`) because MDXEditor touches the DOM during mounting.

import { useRef, useEffect } from "react";
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  ListsToggle,
  CreateLink,
  type MDXEditorMethods,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { cn } from "@heroui/react";

export interface BDWysiwygEditorImplProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const PLUGINS = [
  headingsPlugin(),
  listsPlugin(),
  quotePlugin(),
  thematicBreakPlugin(),
  linkPlugin(),
  markdownShortcutPlugin(),
  toolbarPlugin({
    toolbarContents: () => (
      <>
        <UndoRedo />
        <BoldItalicUnderlineToggles />
        <BlockTypeSelect />
        <ListsToggle />
        <CreateLink />
      </>
    ),
  }),
];

export default function BDWysiwygEditorImpl({
  value,
  onChange,
  placeholder,
  className,
}: BDWysiwygEditorImplProps) {
  const ref = useRef<MDXEditorMethods>(null);

  useEffect(() => {
    const current = ref.current?.getMarkdown() ?? "";
    if (current !== value) {
      ref.current?.setMarkdown(value);
    }
  }, [value]);

  return (
    <div
      className={cn(
        "mdx-editor-wrapper rounded-lg border border-slate-200 bg-white",
        className,
      )}
    >
      <MDXEditor
        ref={ref}
        markdown={value}
        onChange={onChange}
        placeholder={placeholder}
        plugins={PLUGINS}
        contentEditableClassName="bd-markdown min-h-[160px] p-3 outline-none"
      />
    </div>
  );
}
