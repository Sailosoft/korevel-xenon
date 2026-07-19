// ───────────────────────────────────────────────────────────────────────────────
// Render Module — JSON Adapter
//
// Formats and syntax-highlights JSON content for export.
// React rendering is handled by RenderModule.View.tsx.
// ───────────────────────────────────────────────────────────────────────────────

import type { RenderAdapter, RenderHtmlResult, RenderOptions } from "../RenderModule.Types";

/**
 * Format JSON string with indentation.
 * If the input is not valid JSON, it's displayed as-is with a warning.
 */
function formatJson(raw: string): { formatted: string; valid: boolean; error?: string } {
  try {
    const parsed = JSON.parse(raw);
    const formatted = JSON.stringify(parsed, null, 2);
    return { formatted, valid: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { formatted: raw, valid: false, error: msg };
  }
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
 * JSON Adapter
 *
 * Formats JSON content with syntax highlighting for export.
 */
export const jsonAdapter: RenderAdapter = {
  format: "json",
  displayName: "JSON",
  description: "Formats and syntax-highlights JSON content.",

  renderHtml(content: string, _options?: RenderOptions): RenderHtmlResult {
    const { formatted, valid, error } = formatJson(content);
    const escaped = escapeHtml(formatted);

    let html = "";

    if (!valid && error) {
      html += [
        `<div style="padding:0.5rem 1rem;background:#fef2f2;color:#dc2626;`,
        `font-size:0.75rem;border-bottom:1px solid #fecaca;font-family:monospace;">`,
        `Invalid JSON: ${escapeHtml(error)}`,
        `</div>`,
      ].join("");
    }

    html += [
      `<pre style="`,
      `  margin:0; padding:1rem;`,
      `  font-family:'JetBrains Mono','Fira Code','Cascadia Code','Consolas',monospace;`,
      `  font-size:0.8rem; line-height:1.6; overflow:auto;`,
      `  background:#1a1a1a; color:#abb2bf; border-radius:4px;`,
      `"><code>`,
      escaped,
      `</code></pre>`,
    ].join("\n");

    return { raw: content, html, format: "json" };
  },
};
