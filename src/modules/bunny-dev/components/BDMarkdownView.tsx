"use client";

// BDMarkdownView — renders markdown with GFM support using the module theme.

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@heroui/react";

export interface BDMarkdownViewProps {
  content: string;
  className?: string;
}

export function BDMarkdownView({ content, className }: BDMarkdownViewProps) {
  return (
    <div className={cn("bd-markdown", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

export default BDMarkdownView;
