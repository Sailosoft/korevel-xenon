"use client";

// BDWysiwygEditor — client-only MDXEditor wrapper with a loading placeholder.

import dynamic from "next/dynamic";

export type BDWysiwygEditorVariant = "full" | "compact";

export interface BDWysiwygEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Editor variant: "full" for descriptions, "compact" for comment composers. */
  variant?: BDWysiwygEditorVariant;
  /** Minimum content height in pixels. Defaults to 160 (full) / 96 (compact). */
  minHeight?: number;
}

const BDWysiwygEditorImpl = dynamic(
  () => import("./BDWysiwygEditor.impl"),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[160px] items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-400">
        Loading editor…
      </div>
    ),
  },
);

export function BDWysiwygEditor(props: BDWysiwygEditorProps) {
  return <BDWysiwygEditorImpl {...props} />;
}

export default BDWysiwygEditor;
