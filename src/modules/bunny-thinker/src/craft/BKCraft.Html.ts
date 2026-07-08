// BKCraft.Html.ts
//
// HTML export utilities — converts craft output into a self-contained
// standalone HTML document for sharing or printing.

import { BKCraftEngine } from "./BKCraft.Engine";
import type { BKCraftFormat } from "./BKCraft.Types";

/**
 * Convert craft content into a self-contained, readable standalone HTML
 * document. Detects the craft format automatically and:
 *   - For "mermaid": includes Mermaid CDN script (v11) to render diagrams
 *   - For "markdown": includes marked CDN to render markdown at load time
 *   - For "tailwind": includes Tailwind CDN
 *   - For all other formats: wraps the already-parsed output in a clean shell
 */
export function convertToExportHtml(
  raw: string,
  format: BKCraftFormat,
): string {
  const processed = BKCraftEngine.process(raw, format);

  // ── Common style — clean, readable, works everywhere ────────────
  const css = `
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
    code { font-family: "JetBrains Mono", "Fira Code", "Cascadia Code", monospace; }
    table {
      border-collapse: collapse; width: 100%; margin: 1em 0;
    }
    th, td { border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: left; }
    th { background: #f9fafb; font-weight: 600; }
    img { max-width: 100%; height: auto; border-radius: 8px; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .bk-export-footer {
      margin-top: 3rem; padding-top: 1rem;
      border-top: 1px solid #e5e7eb;
      font-size: 0.8rem; color: #9ca3af; text-align: center;
    }
  `.trim();

  // ── Determine document title ───────────────────────────────────────
  const title = `Export — ${format}`;

  // ── Body content based on format ────────────────────────────────────
  let bodyContent: string;
  let extraHead = "";

  switch (format) {
    case "mermaid": {
      // Extract diagram code from fences or raw
      const mermaidMatch = raw.match(/```mermaid\n?([\s\S]*?)```/);
      const diagram = mermaidMatch ? mermaidMatch[1].trim() : raw.trim();
      extraHead = [
        `<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>`,
        `<script>mermaid.initialize({ startOnLoad: true, theme: "default" });</script>`,
      ].join("\n");
      bodyContent = `<div class="mermaid" style="margin:1.5rem 0;">\n${diagram}\n</div>`;
      break;
    }

    case "markdown": {
      // Use marked CDN to render markdown at load time
      extraHead = `<script src="https://cdn.jsdelivr.net/npm/marked@15/marked.min.js"></script>`;
      // Escape the raw markdown into a JS string literal so it can be injected
      const escaped = raw
        .replace(/\\/g, "\\\\")
        .replace(/`/g, "\\`")
        .replace(/\$/g, "\\$");
      bodyContent = [
        `<div id="md-content" style="display:none">${escaped}</div>`,
        `<div id="md-output" class="prose"></div>`,
        `<script>`,
        `  (function() {`,
        `    const src = document.getElementById("md-content").textContent;`,
        `    document.getElementById("md-output").innerHTML = marked.parse(src);`,
        `  })();`,
        `</script>`,
      ].join("\n");
      break;
    }

    case "tailwind": {
      extraHead = `<script src="https://cdn.tailwindcss.com"></script>`;
      bodyContent = raw;
      break;
    }

    case "csv":
    case "json":
    case "imageList": {
      bodyContent = processed.parsed;
      break;
    }

    case "html": {
      // Raw HTML content — inject directly
      bodyContent = raw;
      break;
    }

    case "plain": {
      bodyContent = [
        `<pre style="white-space:pre-wrap;font-family:monospace;font-size:0.9rem;background:#f9fafb;padding:1rem;border-radius:8px;">`,
        raw,
        `</pre>`,
      ].join("");
      break;
    }

    case "architecture":
    case "agentSwarm":
    case "docker": {
      // Code-like formats: wrap in <pre><code>
      bodyContent = `<pre><code>${raw}</code></pre>`;
      break;
    }

    default: {
      bodyContent = processed.parsed;
      break;
    }
  }

  // ── Assemble the HTML document ──────────────────────────────────────
  return [
    `<!DOCTYPE html>`,
    `<html lang="en">`,
    `<head>`,
    `  <meta charset="UTF-8" />`,
    `  <meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
    `  <title>${title}</title>`,
    `  <style>${css}</style>`,
    `  ${extraHead}`,
    `</head>`,
    `<body>`,
    `  ${bodyContent}`,
    `  <div class="bk-export-footer">`,
    `    Exported from Bunny Thinker — ${new Date().toISOString().slice(0, 10)}`,
    `  </div>`,
    `</body>`,
    `</html>`,
  ].join("\n");
}
