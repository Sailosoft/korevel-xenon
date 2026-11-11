"use client";

// BDWysiwygEditor.impl — MDXEditor-based markdown WYSIWYG.
//
// Loaded only on the client by the BDWysiwygEditor wrapper (`dynamic`,
// `ssr: false`) because MDXEditor touches the DOM during mounting.

import {
  useRef,
  useEffect,
  useMemo,
  useCallback,
  type CSSProperties,
} from "react";
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
  const lastPropRef = useRef(value);
  const lastEmittedRef = useRef(value);

  const handleChange = useCallback(
    (next: string) => {
      lastEmittedRef.current = next;
      onChange(next);
    },
    [onChange],
  );

  useEffect(() => {
    if (value === lastPropRef.current) return;
    lastPropRef.current = value;
    if (value === lastEmittedRef.current) return;
    if (ref.current?.getMarkdown() === value) return;
    ref.current?.setMarkdown(value);
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
        onChange={handleChange}
        placeholder={placeholder}
        plugins={plugins}
        contentEditableClassName={
          variant === "compact"
            ? "bd-markdown prose prose-sm max-w-none p-3 outline-none dark:prose-invert"
            : "bd-markdown prose max-w-none p-3 outline-none dark:prose-invert"
        }
      />
    </div>
  );
}
