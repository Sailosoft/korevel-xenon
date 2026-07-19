// ───────────────────────────────────────────────────────────────────────────────
// Render Module — Mermaid Adapter
//
// Processes Mermaid diagram definitions for HTML export.
// React rendering is handled by RenderModule.View.tsx using MermaidRenderer.
// ───────────────────────────────────────────────────────────────────────────────

import type { RenderAdapter, RenderHtmlResult, RenderOptions } from "../RenderModule.Types";

/**
 * Extract mermaid diagram code from raw input.
 * Strips ```mermaid fences if present.
 */
function extractDiagram(raw: string): string {
  const fenceMatch = raw.match(/```mermaid\n?([\s\S]*?)```/);
  return fenceMatch ? fenceMatch[1].trim() : raw.trim();
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
 * Mermaid Adapter
 *
 * For HTML export: wraps the diagram definition in a `<pre class="mermaid">`
 * element and includes the Mermaid CDN script for client-side rendering.
 */
export const mermaidAdapter: RenderAdapter = {
  format: "mermaid",
  displayName: "Mermaid Diagram",
  description: "Renders Mermaid diagram definitions as interactive SVG diagrams.",

  renderHtml(content: string, _options?: RenderOptions): RenderHtmlResult {
    const diagram = extractDiagram(content);

    const html = [
      `<div class="rm-mermaid" style="margin:1.5rem 0;text-align:center;">`,
      `  <pre class="mermaid" style="display:inline-block;background:transparent;">`,
      `    ${escapeHtml(diagram)}`,
      `  </pre>`,
      `</div>`,
      `<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>`,
      `<script>mermaid.initialize({ startOnLoad: true, theme: "default" });</script>`,
    ].join("\n");

    return { raw: content, html, format: "mermaid" };
  },
};
