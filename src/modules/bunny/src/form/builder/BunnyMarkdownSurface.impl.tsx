"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
} from "react";
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  type MDXEditorMethods,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { cn } from "@heroui/react";

export interface BunnyMarkdownSurfaceProps {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  minHeight?: number;
  className?: string;
}

const PLUGINS = [
  headingsPlugin(),
  listsPlugin(),
  quotePlugin(),
  thematicBreakPlugin(),
  markdownShortcutPlugin(),
];

export default function BunnyMarkdownSurfaceImpl({
  value,
  onChange,
  placeholder,
  readOnly,
  minHeight = 120,
  className,
}: BunnyMarkdownSurfaceProps) {
  const ref = useRef<MDXEditorMethods>(null);
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
      style={{ "--mdx-min-height": `${minHeight}px` } as CSSProperties}
      className={cn("mdx-editor-wrapper", className)}
    >
      <MDXEditor
        ref={ref}
        markdown={value}
        onChange={handleChange}
        placeholder={placeholder}
        readOnly={readOnly}
        plugins={PLUGINS}
        contentEditableClassName="bd-markdown prose prose-sm max-w-none p-2 outline-none dark:prose-invert"
      />
    </div>
  );
}
