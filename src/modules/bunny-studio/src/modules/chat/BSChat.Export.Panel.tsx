// BSChat.Export.Panel — Export (AI-only) section for Bunny Studio chat settings.
//
// Rendered inside the conversation settings panel (BSChat.SettingsPanel) that
// appears in the conversation view. Lets the user:
//  - View the whole conversation as HTML (AI responses only) in a new tab.
//  - Download the whole conversation as an HTML file (AI responses only).
//  - Copy the whole HTML document (AI responses only) to the clipboard.
//  - Copy the plain-text AI-only transcript to the clipboard.
//
// Component-only: it delegates all logic to the useBSChatExport hook and the
// pure template in BSChat.Export.Template.ts.

"use client";

import React from "react";
import {
  Download,
  Eye,
  ClipboardCopy,
  FileText,
  MessagesSquare,
} from "lucide-react";
import type { BSConversation } from "./BSChat.Types";
import { useBSChatExport } from "./BSChat.Export.Hooks";

// ─── Props ─────────────────────────────────────────────────────────────

export interface BSChatExportPanelProps {
  /** Full conversation list — only AI (assistant) responses are exported. */
  conversations: BSConversation[];
  /** Chat title used in the exported document. */
  chatTitle?: string;
}

// ─── Shared button styles ──────────────────────────────────────────────

const EXPORT_BUTTON_CLASS =
  "flex items-center gap-1.5 w-full px-3 py-2 rounded-lg text-xs font-medium border transition";

// ─── Component ─────────────────────────────────────────────────────────

export function BSChatExportPanel({
  conversations,
  chatTitle,
}: BSChatExportPanelProps) {
  const {
    itemCount,
    copied,
    viewHtml,
    downloadHtml,
    copyHtml,
    copyText,
  } = useBSChatExport({ conversations, chatTitle });

  const hasContent = itemCount > 0;

  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1.5">
        <MessagesSquare className="w-3.5 h-3.5" /> Export (AI responses only)
      </label>
      <p className="text-[10px] text-gray-400 mb-2">
        {hasContent
          ? `${itemCount} AI response${itemCount === 1 ? "" : "s"} · user questions are excluded.`
          : "No AI responses to export yet."}
      </p>

      <div className="grid grid-cols-2 gap-1.5">
        <button
          onClick={viewHtml}
          disabled={!hasContent}
          title="Open the whole conversation (AI responses only) as HTML in a new tab"
          className={`${EXPORT_BUTTON_CLASS} text-red-600 bg-red-50 hover:bg-red-100 border-red-200 disabled:opacity-40 disabled:pointer-events-none`}
        >
          <Eye className="w-3.5 h-3.5" /> View HTML
        </button>

        <button
          onClick={() => downloadHtml()}
          disabled={!hasContent}
          title="Download the whole conversation (AI responses only) as an HTML file"
          className={`${EXPORT_BUTTON_CLASS} text-red-600 bg-red-50 hover:bg-red-100 border-red-200 disabled:opacity-40 disabled:pointer-events-none`}
        >
          <Download className="w-3.5 h-3.5" /> Download HTML
        </button>

        <button
          onClick={() => void copyHtml()}
          disabled={!hasContent}
          title="Copy the whole HTML document (AI responses only) to the clipboard"
          className={`${EXPORT_BUTTON_CLASS} text-gray-600 bg-gray-50 hover:bg-gray-100 border-gray-200 disabled:opacity-40 disabled:pointer-events-none ${
            copied === "html" ? "!text-green-600 !border-green-300" : ""
          }`}
        >
          <ClipboardCopy className="w-3.5 h-3.5" />
          {copied === "html" ? "Copied!" : "Copy HTML"}
        </button>

        <button
          onClick={() => void copyText()}
          disabled={!hasContent}
          title="Copy the plain-text AI-only transcript to the clipboard"
          className={`${EXPORT_BUTTON_CLASS} text-gray-600 bg-gray-50 hover:bg-gray-100 border-gray-200 disabled:opacity-40 disabled:pointer-events-none ${
            copied === "text" ? "!text-green-600 !border-green-300" : ""
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          {copied === "text" ? "Copied!" : "Copy Text"}
        </button>
      </div>
    </div>
  );
}

export default BSChatExportPanel;
