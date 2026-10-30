"use client";

import dynamic from "next/dynamic";
import { forwardRef, useRef, type RefObject } from "react";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import type { IBLEditorProps } from "./BLEditor.impl";

export type { IBLEditorProps } from "./BLEditor.impl";

const BLEditorImpl = dynamic(() => import("./BLEditor.impl"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[150px] items-center justify-center rounded-md border bg-white text-sm text-slate-400 dark:bg-slate-950">
      Loading editor…
    </div>
  ),
});

const BLEditor = forwardRef<MDXEditorMethods, IBLEditorProps>((props, ref) => {
  const internalRef = useRef<MDXEditorMethods | null>(null);
  const editorRef = (ref ?? internalRef) as RefObject<MDXEditorMethods | null>;

  return <BLEditorImpl {...props} editorRef={editorRef} />;
});

BLEditor.displayName = "BLEditor";

export default BLEditor;
