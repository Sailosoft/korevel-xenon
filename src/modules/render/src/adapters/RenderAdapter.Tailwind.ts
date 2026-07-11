// ───────────────────────────────────────────────────────────────────────────────
// Render Module — Tailwind CSS Adapter
//
// Processes HTML content with Tailwind CSS utility classes for export.
// React rendering is handled by RenderModule.View.tsx using an iframe
// with the Tailwind CDN loaded.
// ───────────────────────────────────────────────────────────────────────────────

import type { RenderAdapter, RenderHtmlResult, RenderOptions } from "../RenderModule.Types";

/**
 * Build a complete HTML document wrapping Tailwind content with the CDN.
 */
function buildTailwindDocument(raw: string): string {
  return [
    `<!DOCTYPE html>`,
    `<html lang="en">`,
    `<head>`,
    `  <meta charset="UTF-8" />`,
    `  <meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
    `  <script src="https://cdn.tailwindcss.com"></script>`,
    `</head>`,
    `<body>`,
    `  ${raw}`,
    `</body>`,
    `</html>`,
  ].join("\n");
}

/**
 * Tailwind Adapter
 *
 * Wraps content with Tailwind CSS CDN for export.
 * The raw content is expected to be HTML with Tailwind utility classes
 * (e.g. className attributes with Tailwind classes like "flex p-4 bg-blue-500").
 */
export const tailwindAdapter: RenderAdapter = {
  format: "tailwind",
  displayName: "Tailwind Design",
  description: "Renders HTML content with Tailwind CSS utility classes via CDN.",

  renderHtml(content: string, _options?: RenderOptions): RenderHtmlResult {
    const html = buildTailwindDocument(content);
    return { raw: content, html, format: "tailwind" };
  },
};
