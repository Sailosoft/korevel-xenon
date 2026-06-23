"use client";

import { useCallback, useState } from "react";
import {
  BookOpenIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  XIcon,
} from "lucide-react";
import { getWorkflowYamlGuideMarkdown } from "./BFlowWorkflow.Guide";

/**
 * A collapsible panel that displays the workflow YAML structure guide.
 * The guide content is auto-generated from the `BFlowWorkflowSchema` Zod schema
 * using `toJSONSchema()` and rendered as human-readable markdown.
 */
export default function BFlowWorkflowGuidePanel({
  show,
  onClose,
}: {
  show: boolean;
  onClose?: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const guideMarkdown = getWorkflowYamlGuideMarkdown();

  const handleClose = useCallback(() => {
    setExpanded(false);
    onClose?.();
  }, [onClose]);

  if (!show) return null;

  return (
    <div className="border rounded-lg bg-slate-50 dark:bg-slate-900 mb-4 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDownIcon className="size-4 text-slate-500" />
          ) : (
            <ChevronRightIcon className="size-4 text-slate-500" />
          )}
          <BookOpenIcon className="size-4 text-blue-500" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            YAML Structure Guide
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            aria-label="Close guide"
          >
            <XIcon className="size-3.5 text-slate-400" />
          </button>
        )}
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-4 pb-4 pt-1">
          <div className="bg-white dark:bg-slate-950 rounded-md p-4 border text-sm leading-relaxed max-h-[400px] overflow-y-auto">
            <RenderGuideMarkdown markdown={guideMarkdown} />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Simple markdown renderer for the guide content.
 * Handles: headings, bold, code, inline code, blockquotes, lists, horizontal rules.
 */
function RenderGuideMarkdown({ markdown }: { markdown: string }) {
  const lines = markdown.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let codeBlockLanguage = "";

  const flushCodeBlock = (key: number) => {
    if (codeBlockLines.length > 0) {
      elements.push(
        <pre
          key={key}
          className="bg-slate-100 dark:bg-slate-800 rounded p-3 overflow-x-auto text-xs font-mono my-2"
        >
          <code>{codeBlockLines.join("\n")}</code>
        </pre>,
      );
      codeBlockLines = [];
    }
  };

  lines.forEach((line, index) => {
    // Code block handling
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        flushCodeBlock(index);
        inCodeBlock = false;
        codeBlockLanguage = "";
      } else {
        inCodeBlock = true;
        codeBlockLanguage = line.slice(3).trim();
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      return;
    }

    // Empty line
    if (line.trim() === "") {
      elements.push(<div key={index} className="h-2" />);
      return;
    }

    // Horizontal rule
    if (line.startsWith("---")) {
      elements.push(
        <hr
          key={index}
          className="my-3 border-slate-200 dark:border-slate-700"
        />,
      );
      return;
    }

    // Blockquote
    if (line.startsWith(">")) {
      const content = renderInlineMarkdown(line.replace(/^>\s?/, ""));
      elements.push(
        <blockquote
          key={index}
          className="border-l-4 border-blue-300 pl-3 py-1 my-2 text-slate-600 dark:text-slate-400 text-xs italic"
        >
          {content}
        </blockquote>,
      );
      return;
    }

    // Heading level 1
    if (line.startsWith("# ")) {
      const content = renderInlineMarkdown(line.slice(2));
      elements.push(
        <h1
          key={index}
          className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2 mt-1"
        >
          {content}
        </h1>,
      );
      return;
    }

    // Heading level 2
    if (line.startsWith("## ")) {
      const content = renderInlineMarkdown(line.slice(3));
      elements.push(
        <h2
          key={index}
          className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1 mt-3"
        >
          {content}
        </h2>,
      );
      return;
    }

    // List items
    if (line.startsWith("- ")) {
      const content = renderInlineMarkdown(line.slice(2));
      elements.push(
        <div key={index} className="flex gap-2 text-xs py-0.5">
          <span className="text-slate-400 mt-0.5 shrink-0">•</span>
          <span className="text-slate-700 dark:text-slate-300">{content}</span>
        </div>,
      );
      return;
    }

    // Regular paragraph
    const content = renderInlineMarkdown(line);
    elements.push(
      <p key={index} className="text-xs text-slate-600 dark:text-slate-400">
        {content}
      </p>,
    );
  });

  // Flush any remaining code block
  if (inCodeBlock) {
    flushCodeBlock(lines.length);
  }

  return <>{elements}</>;
}

/**
 * Renders inline markdown: bold, code, italic.
 */
function renderInlineMarkdown(text: string): React.ReactNode {
  // Split by inline code patterns first
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    // Inline code
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-xs font-mono text-pink-600 dark:text-pink-400"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    // Bold
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((boldPart, j) => {
      if (boldPart.startsWith("**") && boldPart.endsWith("**")) {
        return (
          <strong
            key={`${i}-${j}`}
            className="font-semibold text-slate-800 dark:text-slate-100"
          >
            {boldPart.slice(2, -2)}
          </strong>
        );
      }
      // [Optional] badge
      if (boldPart.includes("[Optional]")) {
        const before = boldPart.split("[Optional]")[0];
        const after = boldPart.split("[Optional]")[1];
        return (
          <span key={`${i}-${j}`}>
            {before}
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 ml-1">
              Optional
            </span>
            {after}
          </span>
        );
      }
      return boldPart;
    });
  });
}
