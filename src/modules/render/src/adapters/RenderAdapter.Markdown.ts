// ───────────────────────────────────────────────────────────────────────────────
// Render Module — Markdown Adapter
//
// Converts Markdown content to HTML for export / server-side rendering.
// React rendering is handled by RenderModule.View.tsx using react-markdown.
// ───────────────────────────────────────────────────────────────────────────────

import type { RenderAdapter, RenderHtmlResult, RenderOptions } from "../RenderModule.Types";

/**
 * Convert basic markdown to HTML using regex.
 * For production use, consider replacing with a proper markdown parser.
 */
function markdownToHtml(raw: string): string {
  if (!raw?.trim()) {
    return '<div class="rm-empty">No content to render</div>';
  }

  let html = raw
    // Code blocks (```...```)
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_match, lang: string, code: string) => {
      const langAttr = lang ? ` class="language-${lang}"` : "";
      return `<pre><code${langAttr}>${escapeHtml(code.trim())}</code></pre>`;
    })
    // Bold
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    // Inline code
    .replace(/`(.*?)`/g, "<code>$1</code>")
    // Headers
    .replace(/^### (.*$)/gm, "<h3>$1</h3>")
    .replace(/^## (.*$)/gm, "<h2>$1</h2>")
    .replace(/^# (.*$)/gm, "<h1>$1</h1>")
    // Unordered list items
    .replace(/^- (.*$)/gm, "<li>$1</li>")
    // Horizontal rules
    .replace(/^---$/gm, "<hr />")
    // Paragraphs (double newlines)
    .replace(/\n\n/g, "</p><p>")
    // Line breaks
    .replace(/\n/g, "<br />");

  html = `<div class="rm-markdown"><p>${html}</p></div>`;
  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, "&#34;")
    .replace(/'/g, "&#039;");
}

/**
 * Markdown Adapter
 *
 * Converts markdown content to HTML. The React View component
 * handles interactive rendering with react-markdown.
 */
export const markdownAdapter: RenderAdapter = {
  format: "markdown",
  displayName: "Markdown",
  description: "Renders Markdown content as formatted text with headings, lists, code blocks, and more.",

  renderHtml(content: string, _options?: RenderOptions): RenderHtmlResult {
    const html = markdownToHtml(content);
    return { raw: content, html, format: "markdown" };
  },
};
