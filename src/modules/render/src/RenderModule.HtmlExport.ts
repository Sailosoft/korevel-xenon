// ───────────────────────────────────────────────────────────────────────────────
// Render Module — HTML Export
//
// Builds a self-contained, standalone HTML document from rendered content
// for sharing, printing, or downloading.
// ───────────────────────────────────────────────────────────────────────────────

import { RenderEngine } from "./RenderModule.Engine";
import type { RenderFormat, RenderOptions } from "./RenderModule.Types";

// ─── Export CSS ──────────────────────────────────────────────────────────────

const EXPORT_CSS = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      "Helvetica Neue", Arial, sans-serif;
    max-width: 960px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
    color: #1f2937;
    background: #ffffff;
    line-height: 1.7;
  }
  h1, h2, h3, h4 { margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 600; }
  h1 { font-size: 1.75rem; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.3em; }
  h2 { font-size: 1.4rem; }
  h3 { font-size: 1.15rem; }
  p  { margin: 0.75em 0; }
  pre {
    background: #f3f4f6; padding: 1rem; border-radius: 8px;
    overflow-x: auto; font-size: 0.9rem;
  }
  code {
    font-family: "JetBrains Mono", "Fira Code", "Cascadia Code", "Consolas", monospace;
  }
  table {
    border-collapse: collapse; width: 100%; margin: 1em 0;
  }
  th, td { border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: left; }
  th { background: #f9fafb; font-weight: 600; }
  img { max-width: 100%; height: auto; border-radius: 8px; }
  a { color: #2563eb; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .rm-export-footer {
    margin-top: 3rem; padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
    font-size: 0.8rem; color: #9ca3af; text-align: center;
  }
  .rm-export-empty {
    padding: 2rem; text-align: center; color: #9ca3af;
    font-style: italic;
  }
`.trim();

// ─── Format-specific head injections ─────────────────────────────────────────

const FORMAT_HEAD_INJECTIONS: Partial<
  Record<RenderFormat, string>
> = {
  mermaid: [
    `<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>`,
    `<script>mermaid.initialize({ startOnLoad: true, theme: "default" });</script>`,
  ].join("\n"),
  mindmap: [
    `<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>`,
    `<script>mermaid.initialize({ startOnLoad: true, theme: "default" });</script>`,
  ].join("\n"),
  markdown: `<script src="https://cdn.jsdelivr.net/npm/marked@15/marked.min.js"></script>`,
  tailwind: `<script src="https://cdn.tailwindcss.com"></script>`,
};

// ─── Export Options ──────────────────────────────────────────────────────────

export interface HtmlExportOptions {
  /** Title for the exported document. Defaults to "Export — {format}" */
  title?: string;
  /** Additional CSS to inject into the document <head> */
  extraCss?: string;
  /** Additional <head> content (meta tags, scripts, etc.) */
  extraHead?: string;
  /** Whether to include the export footer. Defaults to true */
  showFooter?: boolean;
  /** Custom footer text */
  footerText?: string;
  /** Render options passed through to the adapter */
  renderOptions?: RenderOptions;
}

// ─── Export Result ───────────────────────────────────────────────────────────

export interface HtmlExportResult {
  /** The complete HTML document as a string */
  document: string;
  /** The format that was rendered */
  format: RenderFormat;
  /** The original raw content */
  raw: string;
}

// ─── Export Builder ──────────────────────────────────────────────────────────

/**
 * Build a standalone, self-contained HTML document from rendered content.
 *
 * Usage:
 * ```ts
 * import { buildExportHtml } from "./RenderModule.HtmlExport";
 *
 * const result = buildExportHtml("# Hello World", "markdown");
 * // result.document is a complete HTML document string
 *
 * // Trigger download
 * const blob = new Blob([result.document], { type: "text/html" });
 * const url = URL.createObjectURL(blob);
 * const a = document.createElement("a");
 * a.href = url;
 * a.download = "export.html";
 * a.click();
 * ```
 */
export function buildExportHtml(
  content: string,
  format: RenderFormat,
  options: HtmlExportOptions = {},
): HtmlExportResult {
  const {
    title = `Export \u2014 ${format}`,
    extraCss = "",
    extraHead = "",
    showFooter = true,
    footerText,
    renderOptions,
  } = options;

  // Process content through the engine
  let bodyContent: string;
  let formatHeadInject = FORMAT_HEAD_INJECTIONS[format] ?? "";

  try {
    const result = RenderEngine.renderHtml(format, content, renderOptions);
    bodyContent = result.html.html;
  } catch {
    // If no adapter is registered, show a fallback message
    bodyContent = `<div class="rm-export-empty">No renderer available for format "${format}".</div>`;
    formatHeadInject = "";
  }

  // For markdown, use marked CDN to render at load time
  if (format === "markdown") {
    const escaped = content
      .replace(/\\/g, "\\\\")
      .replace(/`/g, "\\`")
      .replace(/\$/g, "\\$");

    const fallbackHtml = "<pre>" + escaped + "</pre>";
    bodyContent = [
      '<div id="rm-md-source" style="display:none">' + escaped + "</div>",
      '<div id="rm-md-output"></div>',
      "<script>",
      "  (function() {",
      '    var src = document.getElementById("rm-md-source").textContent;',
      "    try {",
      '      document.getElementById("rm-md-output").innerHTML = marked.parse(src);',
      "    } catch(e) {",
      '      document.getElementById("rm-md-output").innerHTML = "' + fallbackHtml + '";',
      "    }",
      "  })();",
      "</script>",
    ].join("\n");
  }

  // Build footer
  const footer = showFooter
    ? [
        `  <div class="rm-export-footer">`,
        `    ${footerText ?? `Exported from Render Module \u2014 ${new Date().toISOString().slice(0, 10)}`}`,
        `  </div>`,
      ].join("\n")
    : "";

  // Assemble the HTML document
  const document = [
    `<!DOCTYPE html>`,
    `<html lang="en">`,
    `<head>`,
    `  <meta charset="UTF-8" />`,
    `  <meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
    `  <title>${title}</title>`,
    `  <style>${EXPORT_CSS}</style>`,
    extraCss ? `  <style>${extraCss}</style>` : "",
    formatHeadInject ? `  ${formatHeadInject}` : "",
    extraHead,
    `</head>`,
    `<body>`,
    `  ${bodyContent}`,
    footer,
    `</body>`,
    `</html>`,
  ]
    .filter(Boolean)
    .join("\n");

  return { document, format, raw: content };
}

/**
 * Build multiple content blocks into a single HTML document.
 * Each block is rendered sequentially in the document body.
 */
export function buildMultiExportHtml(
  blocks: Array<{ content: string; format: RenderFormat; label?: string }>,
  options: Omit<HtmlExportOptions, "title"> & { title?: string } = {},
): string {
  const parts: string[] = [];

  for (const block of blocks) {
    if (block.label) {
      parts.push(`<h2>${block.label}</h2>`);
    }
    const result = buildExportHtml(block.content, block.format, {
      ...options,
      showFooter: false,
    });
    parts.push(result.document.replace(/<!DOCTYPE html>[\s\S]*?<body>/, "").replace(/<\/body>[\s\S]*?<\/html>/, ""));
  }

  // Wrap all parts in a single document
  const title = options.title ?? "Multi-Export";
  const footer = (options.showFooter !== false)
    ? `  <div class="rm-export-footer">${options.footerText ?? `Exported from Render Module \u2014 ${new Date().toISOString().slice(0, 10)}`}</div>`
    : "";

  return [
    `<!DOCTYPE html>`,
    `<html lang="en">`,
    `<head>`,
    `  <meta charset="UTF-8" />`,
    `  <meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
    `  <title>${title}</title>`,
    `  <style>${EXPORT_CSS}</style>`,
    options.extraCss ? `  <style>${options.extraCss}</style>` : "",
    options.extraHead || "",
    `</head>`,
    `<body>`,
    ...parts,
    footer,
    `</body>`,
    `</html>`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Trigger a browser download of the exported HTML.
 * Works in client-side (browser) only.
 */
export function downloadExportHtml(
  content: string,
  format: RenderFormat,
  filename?: string,
  options?: HtmlExportOptions,
): void {
  if (typeof window === "undefined") {
    console.warn("[RenderModule] downloadExportHtml can only be used in browser environments.");
    return;
  }

  const result = buildExportHtml(content, format, options);
  const blob = new Blob([result.document], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename ?? `export-${format}-${Date.now()}.html`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
