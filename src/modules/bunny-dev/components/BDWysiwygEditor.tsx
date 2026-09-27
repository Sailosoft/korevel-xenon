"use client";

// BDWysiwygEditor — client-only MDXEditor wrapper with a loading placeholder.

import dynamic from "next/dynamic";

export interface BDWysiwygEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
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
