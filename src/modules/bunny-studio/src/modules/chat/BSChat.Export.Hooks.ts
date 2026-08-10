// BSChat.Export.Hooks — Export logic hook for Bunny Studio chat.
//
// useBSChatExport takes the live conversation list and exposes actions to
// export the whole conversation as an AI-only transcript:
//  - viewHtml()   — open the standalone HTML document in a new browser tab.
//  - downloadHtml() — download the standalone HTML document as a .html file.
//  - copyHtml()   — copy the whole HTML document to the clipboard.
//  - copyText()   — copy the plain-text AI-only transcript to the clipboard.
//
// The HTML markup lives in BSChat.Export.Template.ts (pure logic); this hook
// only wires template output to the browser (blob URLs + clipboard).

"use client";

import { useCallback, useMemo, useState } from "react";
import type { BSConversation } from "./BSChat.Types";
import {
  assistantOnlyConversations,
  assistantOnlyText,
  buildChatExportHtml,
} from "./BSChat.Export.Template";

// ─── Types ─────────────────────────────────────────────────────────────

export interface BSChatExportOptions {
  /** Full conversation list (user + assistant + system). Only AI responses are exported. */
  conversations: BSConversation[];
  /** Chat title used in the exported document (defaults to "Chat Export"). */
  chatTitle?: string;
}

export type BSChatExportCopyKind = "html" | "text" | null;

export interface BSChatExportReturn {
  /** AI-only responses that will be exported. */
  aiOnly: BSConversation[];
  /** Number of AI responses being exported. */
  itemCount: number;
  /** The complete standalone HTML document (AI responses only). */
  htmlDocument: string;
  /** Plain-text transcript of only the AI responses. */
  plainText: string;
  /** Which clipboard action last succeeded ("html" | "text" | null). */
  copied: BSChatExportCopyKind;
  /** Open the HTML document in a new browser tab. */
  viewHtml: () => void;
  /** Download the HTML document as a .html file. */
  downloadHtml: (filename?: string) => void;
  /** Copy the whole HTML document to the clipboard. */
  copyHtml: () => Promise<void>;
  /** Copy the plain-text AI-only transcript to the clipboard. */
  copyText: () => Promise<void>;
}

// ─── Browser helpers ───────────────────────────────────────────────────

/** Build a Blob object URL for the given HTML document. */
function makeHtmlBlobUrl(html: string): string {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  return URL.createObjectURL(blob);
}

function toSlug(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "chat-export";
}

// ─── Hook ──────────────────────────────────────────────────────────────

export function useBSChatExport({
  conversations,
  chatTitle,
}: BSChatExportOptions): BSChatExportReturn {
  const aiOnly = useMemo(
    () => assistantOnlyConversations(conversations),
    [conversations],
  );

  const htmlDocument = useMemo(
    () => buildChatExportHtml(aiOnly, chatTitle || "Chat Export"),
    [aiOnly, chatTitle],
  );

  const plainText = useMemo(() => assistantOnlyText(aiOnly), [aiOnly]);

  const [copied, setCopied] = useState<BSChatExportCopyKind>(null);

  const writeClipboard = useCallback(async (text: string): Promise<void> => {
    await navigator.clipboard.writeText(text);
  }, []);

  const copyHtml = useCallback(async () => {
    try {
      await writeClipboard(htmlDocument);
      setCopied("html");
      window.setTimeout(() => setCopied((c) => (c === "html" ? null : c)), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }, [htmlDocument, writeClipboard]);

  const copyText = useCallback(async () => {
    try {
      await writeClipboard(plainText);
      setCopied("text");
      window.setTimeout(() => setCopied((c) => (c === "text" ? null : c)), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }, [plainText, writeClipboard]);

  const viewHtml = useCallback(() => {
    if (typeof window === "undefined") return;
    const url = makeHtmlBlobUrl(htmlDocument);
    window.open(url, "_blank", "noopener,noreferrer");
    // Revoke after a delay so the new tab has time to load the URL.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }, [htmlDocument]);

  const downloadHtml = useCallback(
    (filename?: string) => {
      if (typeof window === "undefined") return;
      const url = makeHtmlBlobUrl(htmlDocument);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename || `${toSlug(chatTitle || "chat-export")}.html`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    },
    [htmlDocument, chatTitle],
  );

  return {
    aiOnly,
    itemCount: aiOnly.length,
    htmlDocument,
    plainText,
    copied,
    viewHtml,
    downloadHtml,
    copyHtml,
    copyText,
  };
}
