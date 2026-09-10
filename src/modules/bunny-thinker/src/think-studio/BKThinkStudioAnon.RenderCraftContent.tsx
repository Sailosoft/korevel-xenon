"use client";

// BKThinkStudioAnon.RenderCraftContent.tsx
//
// Renders crafted AI output for a step / result panel.
// Split out of BKThinkStudioAnon.tsx so the craft rendering logic is
// reusable and colocated with the anonymous studio.

import React from "react";
import ReactMarkdown from "react-markdown";
import RenderView from "@/src/modules/render/src/components/RenderModule.View";
import type { RenderFormat } from "@/src/modules/render/src/RenderModule.Types";
import Editor from "@monaco-editor/react";
import { BKCraftEngine } from "../craft/BKCraft.Engine";
import type { BKCraftFormat } from "../craft/BKCraft.Types";

// ─── Map BKCraftFormat → RenderFormat for common formats ───────────────
export const BKCRAFT_TO_RENDER_FORMAT: Partial<
  Record<BKCraftFormat, RenderFormat>
> = {
  markdown: "markdown",
  html: "html",
  tailwind: "tailwind",
  csv: "csv",
  json: "json",
  mermaid: "mermaid",
  plain: "plain",
};

// ─── Props ───────────────────────────────────────────────────────────────

export interface BKRenderCraftContentProps {
  content: string;
  craftFormat: BKCraftFormat;
  viewMode: "view" | "raw";
}

// ─── Component ──────────────────────────────────────────────────────────

export default function BKRenderCraftContent({
  content,
  craftFormat,
  viewMode,
}: BKRenderCraftContentProps) {
  // Raw mode: render through ReactMarkdown
  if (viewMode === "raw") {
    return (
      <div className="prose prose-sm prose-code:before:content-none prose-code:after:content-none max-w-none text-gray-800">
        <ReactMarkdown
          components={{
            code({ className, children, ...props }) {
              const isInline = !className;
              const match = /language-(\w+)/.exec(className || "");
              const codeStr = String(children).replace(/\n$/, "");

              if (isInline) {
                return (
                  <code
                    className="px-1.5 py-0.5 bg-gray-100 text-pink-600 rounded text-xs font-mono"
                    {...props}
                  >
                    {children}
                  </code>
                );
              }

              return (
                <div className="relative group">
                  <div className="flex items-center justify-between px-4 py-1.5 bg-gray-800 text-gray-300 text-xs rounded-t-lg">
                    <span>{match?.[1] || "code"}</span>
                    <button
                      onClick={() =>
                        navigator.clipboard.writeText(codeStr)
                      }
                      className="hover:text-white transition-colors"
                      title="Copy code"
                    >
                      Copy
                    </button>
                  </div>
                  <pre className="!mt-0 bg-gray-900 text-gray-100 p-4 rounded-b-lg overflow-x-auto">
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                </div>
              );
            },
            pre({ children }) {
              return <>{children}</>;
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  }

  // View mode: use RenderView for common formats, fallback for craft-only formats
  const renderFormat = BKCRAFT_TO_RENDER_FORMAT[craftFormat];
  if (renderFormat) {
    return (
      <div className="min-h-[120px]">
        <RenderView format={renderFormat} content={content} />
      </div>
    );
  }

  // View mode for craft-only formats — use the Craft Engine + existing renderers
  const processed = BKCraftEngine.process(content, craftFormat);

  switch (craftFormat) {
    case "imageList":
      return (
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: processed.parsed }}
        />
      );
    case "architecture":
      return (
        <div
          className="border border-gray-200 rounded-lg overflow-hidden"
          style={{ minHeight: 420 }}
        >
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-gray-300 text-xs">
            <span>ARCHITECTURE.md</span>
            <span className="text-gray-500">Markdown</span>
          </div>
          <Editor
            height="380px"
            defaultLanguage="markdown"
            value={content}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              wordWrap: "on",
              tabSize: 2,
            }}
          />
        </div>
      );
    case "agentSwarm":
      return (
        <div
          className="border border-gray-200 rounded-lg overflow-hidden"
          style={{ minHeight: 420 }}
        >
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-gray-300 text-xs">
            <span>AGENT.md</span>
            <span className="text-gray-500">Markdown</span>
          </div>
          <Editor
            height="380px"
            defaultLanguage="markdown"
            value={content}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              wordWrap: "on",
              tabSize: 2,
            }}
          />
        </div>
      );
    case "docker":
      return (
        <div
          className="border border-gray-200 rounded-lg overflow-hidden"
          style={{ minHeight: 420 }}
        >
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-gray-300 text-xs">
            <span>docker-compose.yaml</span>
            <span className="text-gray-500">YAML</span>
          </div>
          <Editor
            height="380px"
            defaultLanguage="yaml"
            value={content}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              wordWrap: "on",
              tabSize: 2,
            }}
          />
        </div>
      );
    default:
      return (
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: processed.parsed }}
        />
      );
  }
}