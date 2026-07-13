// ───────────────────────────────────────────────────────────────────────────────
// Render Module — Mindmap Adapter
//
// Converts markdown heading-based mind maps or raw Mermaid mindmap syntax
// into rendered diagrams for HTML export.
//
// Input formats accepted:
//   1. Markdown headings (## Topic → becomes a mindmap branch)
//   2. Mermaid mindmap syntax (mindmap\n  root\n    branch)
//   3. Fenced blocks (```mindmap ... ``` or ```mm ... ```)
//
// React rendering is handled by RenderModule.View.tsx using MermaidRenderer.
// ───────────────────────────────────────────────────────────────────────────────

import type { RenderAdapter, RenderHtmlResult, RenderOptions } from "../RenderModule.Types";

/**
 * Extract and normalize mindmap content from raw input.
 * Handles:
 *   - ```mindmap or ```mm code fences
 *   - Raw Mermaid mindmap syntax
 *   - Markdown heading hierarchy (# → h1, ## → h2, etc.)
 */
function extractMindmap(raw: string): string {
  if (!raw?.trim()) return "";

  // Strip ```mindmap or ```mm fences
  const fenceMatch = raw.match(/```(?:mm|mindmap)\n?([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  // Already Mermaid mindmap syntax
  if (/^mindmap\s/im.test(raw.trim())) return raw.trim();

  // Check if it's markdown headings — convert to mindmap hierarchy
  if (/^#{1,6}\s/.test(raw.trim())) {
    return convertMarkdownHeadingsToMindmap(raw);
  }

  // Raw text — treat as direct mindmap content
  return raw.trim();
}

/**
 * Convert a markdown heading hierarchy into Mermaid mindmap syntax.
 *
 * Input:
 *   # Central Idea
 *   ## Branch A
 *   ### Leaf A1
 *   ## Branch B
 *
 * Output:
 *   mindmap
 *     Central Idea
 *       Branch A
 *         Leaf A1
 *       Branch B
 */
function convertMarkdownHeadingsToMindmap(md: string): string {
  const lines = md.split("\n").filter((l) => l.trim().length > 0);
  const result: string[] = ["mindmap"];

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const indent = "  ".repeat(level);
      result.push(`${indent}${text}`);
    }
  }

  return result.join("\n");
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
 * Mindmap Adapter
 *
 * Converts markdown heading-based mind maps or Mermaid mindmap definitions
 * into rendered diagrams. For HTML export, wraps the diagram in a
 * `<pre class="mermaid">` element with Mermaid CDN for client-side rendering.
 */
export const mindmapAdapter: RenderAdapter = {
  format: "mindmap",
  displayName: "Mind Map",
  description:
    "Renders markdown heading hierarchies or Mermaid mindmap syntax as interactive mind map diagrams.",

  renderHtml(content: string, _options?: RenderOptions): RenderHtmlResult {
    const diagram = extractMindmap(content);

    if (!diagram) {
      return {
        raw: content,
        html: '<div class="rm-empty">No mind map content to render</div>',
        format: "mindmap",
      };
    }

    const html = [
      `<div class="rm-mindmap" style="margin:1.5rem 0;text-align:center;">`,
      `  <pre class="mermaid" style="display:inline-block;background:transparent;">`,
      `    ${escapeHtml(diagram)}`,
      `  </pre>`,
      `</div>`,
      `<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>`,
      `<script>mermaid.initialize({ startOnLoad: true, theme: "default" });</script>`,
    ].join("\n");

    return { raw: content, html, format: "mindmap" };
  },
};
