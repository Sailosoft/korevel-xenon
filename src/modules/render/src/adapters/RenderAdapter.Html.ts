// ───────────────────────────────────────────────────────────────────────────────
// Render Module — HTML Adapter
//
// Processes raw HTML content for export.
// React rendering is handled by RenderModule.View.tsx using a sandboxed iframe.
// ───────────────────────────────────────────────────────────────────────────────

import type { RenderAdapter, RenderHtmlResult, RenderOptions } from "../RenderModule.Types";

/**
 * Check if the input is a complete HTML document
 * (contains DOCTYPE, <html>, <head>, or <body>).
 */
function isCompleteDocument(raw: string): boolean {
  const lower = raw.toLowerCase();
  return (
    lower.includes("<!doctype") ||
    lower.includes("<html") ||
    lower.includes("<head") ||
    lower.includes("<body")
  );
}

/**
 * HTML Adapter
 *
 * For export: if the content is a complete HTML document, it's passed through
 * as-is; otherwise the raw content is wrapped in a div for embedding.
 */
export const htmlAdapter: RenderAdapter = {
  format: "html",
  displayName: "HTML (iframe)",
  description: "Renders raw HTML content for preview and export.",

  renderHtml(content: string, _options?: RenderOptions): RenderHtmlResult {
    const html = isCompleteDocument(content)
      ? content
      : `<div class="rm-html-content">${content}</div>`;

    return { raw: content, html, format: "html" };
  },
};
