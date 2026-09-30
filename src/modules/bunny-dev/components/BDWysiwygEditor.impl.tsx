"use client";

// BDWysiwygEditor.impl — MDXEditor-based markdown WYSIWYG.
//
// Loaded only on the client by the BDWysiwygEditor wrapper (`dynamic`,
// `ssr: false`) because MDXEditor touches the DOM during mounting.

import { useRef, useEffect, useMemo, type CSSProperties } from "react";
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

export type BDWysiwygEditorVariant = "full" | "compact";

export interface BDWysiwygEditorImplProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  variant?: BDWysiwygEditorVariant;
  minHeight?: number;
}

function buildPlugins(variant: BDWysiwygEditorVariant) {
  const toolbarContents =
    variant === "compact" ? (
      <>
        <UndoRedo />
        <BoldItalicUnderlineToggles />
        <ListsToggle />
        <CreateLink />
      </>
    ) : (
      <>
        <UndoRedo />
        <BoldItalicUnderlineToggles />
        <BlockTypeSelect />
        <ListsToggle />
        <CreateLink />
      </>
    );

  return [
    headingsPlugin(),
    listsPlugin(),
    quotePlugin(),
    thematicBreakPlugin(),
    linkPlugin(),
    markdownShortcutPlugin(),
    toolbarPlugin({ toolbarContents: () => toolbarContents }),
  ];
}

export default function BDWysiwygEditorImpl({
  value,
  onChange,
  placeholder,
  className,
  variant = "full",
  minHeight,
}: BDWysiwygEditorImplProps) {
  const ref = useRef<MDXEditorMethods>(null);
  const plugins = useMemo(() => buildPlugins(variant), [variant]);
  const resolvedMinHeight = minHeight ?? (variant === "compact" ? 96 : 160);

  useEffect(() => {
    const current = ref.current?.getMarkdown() ?? "";
    if (current !== value) {
      ref.current?.setMarkdown(value);
    }
  }, [value]);

  return (
    <div
      style={{ "--mdx-min-height": `${resolvedMinHeight}px` } as CSSProperties}
      className={cn(
        "mdx-editor-wrapper rounded-lg border border-slate-200 bg-white",
        variant === "compact" && "mdx-editor-compact",
        className,
      )}
    >
      <MDXEditor
        ref={ref}
        markdown={value}
        onChange={onChange}
        placeholder={placeholder}
        plugins={plugins}
        contentEditableClassName="bd-markdown p-3 outline-none"
      />
    </div>
  );
}
