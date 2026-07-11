// ───────────────────────────────────────────────────────────────────────────────
// Render Module — Plain Text Adapter
//
// Renders content as plain, unformatted text with monospace font and
// whitespace preservation.
// ───────────────────────────────────────────────────────────────────────────────

import type { RenderAdapter, RenderHtmlResult, RenderOptions } from "../RenderModule.Types";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, "&#34;")
    .replace(/'/g, "&#039;");
}

/**
 * Plain Text Adapter
 *
 * Renders content as-is with preserved whitespace in a monospace font.
 * No formatting, no syntax highlighting, no transformations.
 */
export const plainTextAdapter: RenderAdapter = {
  format: "plain",
  displayName: "Plain Text",
  description: "Renders content as plain unformatted text with preserved whitespace.",

  renderHtml(content: string, _options?: RenderOptions): RenderHtmlResult {
    const html = [
      `<pre class="rm-plain" style="`,
      `  white-space: pre-wrap;`,
      `  word-break: break-word;`,
      `  font-family: "JetBrains Mono", "Fira Code", "Cascadia Code", "Consolas", monospace;`,
      `  font-size: 0.85rem;`,
      `  line-height: 1.6;`,
      `  padding: 1rem;`,
      `  background: #f9fafb;`,
      `  border-radius: 8px;`,
      `  overflow-x: auto;`,
      `">`,
      escapeHtml(content),
      `</pre>`,
    ].join("\n");

    return { raw: content, html, format: "plain" };
  },
};
