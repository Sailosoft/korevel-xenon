// BKMemory.Export.ts
//
// Export utilities for BKMemory — view and download neuron content
// as standalone HTML documents, copy to clipboard, and blob preview.

import { RenderEngine } from "@/src/modules/render/src/RenderModule.Engine";
import type { RenderFormat } from "@/src/modules/render/src/RenderModule.Types";
import type { BKMemory, BKMemoryNeuron } from "./BKMemory.Types";

// ─── Constants ──────────────────────────────────────────────────────────────

/** Head injections needed by specific render formats (CDN scripts etc.). */
const FORMAT_HEAD_INJECTIONS: Partial<Record<RenderFormat, string>> = {
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

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * HTML-escape a string so it displays as source code in the browser.
 */
export function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "\x26amp;")
    .replace(/</g, "\x26lt;")
    .replace(/>/g, "\x26gt;")
    .replace(/"/g, "\x26quot;")
    .replace(/'/g, "&#039;");
}

// ─── Copy to clipboard ──────────────────────────────────────────────────────

/**
 * Copy content to the clipboard. Falls back to legacy execCommand if the
 * async clipboard API is unavailable.
 */
export async function bkCopyContent(content: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(content);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = content;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}

// ─── Download as text ───────────────────────────────────────────────────────

/**
 * Trigger a browser download of content as a text file.
 */
export function bkDownloadContent(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── View raw neuron blob in new tab ────────────────────────────────────────

/**
 * Open a neuron's content in a new browser tab for preview.
 * Uses text/html for most formats, application/json for JSON.
 */
export function bkViewNeuronBlob(content: string, format?: string): void {
  const mimeType = format === "json" ? "application/json" : "text/html";
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

// ─── Render single neuron to HTML fragment ──────────────────────────────────

/**
 * Render a single neuron's content to an HTML fragment based on its format.
 *
 * - codeblock/plain/json → HTML-escaped + styled <pre><code>
 * - markdown            → uses marked CDN for client-side rendering
 *                          (raw source in hidden div, rendered at load time)
 * - All other formats   → uses RenderEngine.renderHtml() for proper
 *   rendered output (csv → table, mermaid → diagram, html → raw, etc.)
 */
export function renderNeuronToHtml(
  neuron: BKMemoryNeuron,
  index: number,
  getNeuronFormat: (neuronId: string) => RenderFormat,
): string {
  const nFmt = getNeuronFormat(neuron.id);
  const header = neuron.name || `Neuron #${neuron.order + 1}`;
  const CODE_LIKE_FORMATS = new Set(["codeblock", "plain", "json"]);

  let bodyContent: string;

  if (CODE_LIKE_FORMATS.has(nFmt)) {
    // HTML-escape + styled <pre><code> for source-code display — light theme
    bodyContent = [
      `<pre style="background:var(--bg-code,#f1f5f9);padding:1rem 1.25rem;border-radius:var(--radius-code,10px);overflow-x:auto;font-size:0.82rem;font-family:var(--font-mono,'JetBrains Mono','Fira Code',monospace);line-height:1.65;color:var(--text-primary,#0b0f19);border:1px solid var(--border-subtle,#e9edf2);">`,
      `<code>${htmlEscape(neuron.value)}</code>`,
      `</pre>`,
    ].join("\n");
  } else if (nFmt === "markdown") {
    // Use marked CDN for client-side markdown rendering
    const escaped = neuron.value
      .replace(/\\/g, "\\\\")
      .replace(/`/g, "\\`")
      .replace(/\$/g, "\\$");

    const fallbackHtml = `<pre>${escaped}</pre>`;
    bodyContent = [
      `<div id="rm-md-source-${index}" style="display:none">${escaped}</div>`,
      `<div id="rm-md-output-${index}"></div>`,
      `<script>`,
      `  (function() {`,
      `    var src = document.getElementById("rm-md-source-${index}").textContent;`,
      `    try {`,
      `      document.getElementById("rm-md-output-${index}").innerHTML = marked.parse(src);`,
      `    } catch(e) {`,
      `      document.getElementById("rm-md-output-${index}").innerHTML = \`${fallbackHtml}\`;`,
      `    }`,
      `  })();`,
      `</script>`,
    ].join("\n");
  } else {
    // Use RenderEngine for proper rendered output (csv→table, mermaid→diagram, etc.)
    try {
      const result = RenderEngine.renderHtml(nFmt, neuron.value);
      bodyContent = result.html.html;
    } catch {
      // Fallback: show escaped content if rendering fails
      bodyContent = `<pre style="background:var(--bg-surface,#f3f4f6);padding:1rem 1.25rem;border-radius:var(--radius-code,10px);overflow-x:auto;font-size:0.82rem;font-family:var(--font-mono,monospace);line-height:1.65;color:var(--text-secondary,#4a5568);border:1px solid var(--border-subtle,#e9edf2);"><code>${htmlEscape(neuron.value)}</code></pre>`;
    }
  }

  const slug = `neuron-${index}`;

  return [
    `<div class="neuron-section" id="${slug}">`,
    `  <div class="neuron-header">`,
    `    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;opacity:0.7;"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
    `    ${htmlEscape(header)}`,
    `    <span class="neuron-format">${htmlEscape(nFmt)}</span>`,
    `  </div>`,
    `  ${bodyContent}`,
    `  <a href="#toc" class="back-to-index">\u2191 Back to index</a>`,
    `</div>`,
  ].join("\n");
}

// ─── Build standalone HTML document ─────────────────────────────────────────

/**
 * Build a standalone HTML document from individual neurons, each rendered
 * according to its own format via renderNeuronToHtml. Collects format-specific
 * CDN injections needed by certain formats (mermaid, markdown, etc.).
 */
export function buildStandaloneHtml(
  neurons: BKMemoryNeuron[],
  memory: BKMemory | null,
  getNeuronFormat: (neuronId: string) => RenderFormat,
): string {
  const sorted = [...neurons].sort((a, b) => a.order - b.order);

  // Render each neuron section and collect needed head injections
  const headInjections = new Set<string>();
  const sections = sorted.map((neuron, i) => {
    const nFmt = getNeuronFormat(neuron.id);
    const injection = FORMAT_HEAD_INJECTIONS[nFmt];
    if (injection) headInjections.add(injection);
    return renderNeuronToHtml(neuron, i, getNeuronFormat);
  });

  const headContent = Array.from(headInjections).join("\n");

  // Build table of contents
  const tocItems = sorted.map((neuron, i) => {
    const header = neuron.name || `Neuron #${neuron.order + 1}`;
    const nFmt = getNeuronFormat(neuron.id);
    return [
      `    <li class="toc-item">`,
      `      <a href="#neuron-${i}" class="toc-link">`,
      `        <span class="toc-badge">${htmlEscape(nFmt)}</span>`,
      `        ${htmlEscape(header)}`,
      `      </a>`,
      `    </li>`,
    ].join("\n");
  });

  const tocHtml = [
    `<div class="toc" id="toc">`,
    `  <div class="toc-title">Contents</div>`,
    `  <ul class="toc-list">`,
    tocItems.join("\n"),
    `  </ul>`,
    `</div>`,
  ].join("\n");

  return [
    `<!DOCTYPE html>`,
    `<html lang="en">`,
    `<head>`,
    `  <meta charset="UTF-8" />`,
    `  <meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
    `  <title>${htmlEscape(memory?.name || "Memory Export")}</title>`,
    headContent && `  ${headContent.replace(/\n/g, "\n  ")}`,
    `  <style>`,
    `    /* ─── Design Tokens ─────────────────────────────────────────── */`,
    `    :root {`,
    `      --bg-page: #f4f6f9;`,
    `      --bg-card: #ffffff;`,
    `      --bg-card-hover: #fafbfc;`,
    `      --bg-surface: #f8f9fb;`,
    `      --bg-code: #f1f5f9;`,
    `      --bg-accent-soft: #f5f3ff;`,
    `      --border-subtle: #e9edf2;`,
    `      --border-card: rgba(255,255,255,0.6);`,
    `      --text-primary: #0b0f19;`,
    `      --text-secondary: #475569;`,
    `      --text-muted: #94a3b8;`,
    `      --text-accent: #6d28d9;`,
    `      --text-accent-light: #7c3aed;`,
    `      --accent-gradient: linear-gradient(135deg, #6d28d9, #8b5cf6);`,
    `      --accent-gradient-2: linear-gradient(135deg, #7c3aed, #a78bfa);`,
    `      --shadow-card: 0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.05);`,
    `      --shadow-card-hover: 0 4px 12px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.08);`,
    `      --shadow-badge: 0 1px 3px rgba(109,40,217,0.2);`,
    `      --radius-card: 16px;`,
    `      --radius-section: 12px;`,
    `      --radius-code: 10px;`,
    `      --radius-badge: 999px;`,
    `      --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,`,
    `        "Helvetica Neue", Arial, "Noto Sans", sans-serif;`,
    `      --font-mono: "JetBrains Mono", "Fira Code", "Cascadia Code", "Consolas", monospace;`,
    `      --transition-fast: 0.2s cubic-bezier(0.4, 0, 0.2, 1);`,
    `      --transition-med: 0.35s cubic-bezier(0.4, 0, 0.2, 1);`,
    `    }`,
    ``,
    `    /* ─── Reset & Base ──────────────────────────────────────────── */`,
    `    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }`,
    `    html {`,
    `      scroll-behavior: smooth;`,
    `      -webkit-text-size-adjust: 100%;`,
    `    }`,
    `    body {`,
    `      font-family: var(--font-sans);`,
    `      padding: 1.5rem;`,
    `      line-height: 1.7;`,
    `      color: var(--text-primary);`,
    `      background: var(--bg-page);`,
    `      display: flex;`,
    `      flex-direction: column;`,
    `      align-items: center;`,
    `      min-height: 100vh;`,
    `      -webkit-font-smoothing: antialiased;`,
    `      -moz-osx-font-smoothing: grayscale;`,
    `    }`,
    `    @media (max-width: 640px) {`,
    `      body { padding: 0.75rem; }`,
    `    }`,
    ``,
    `    /* ─── Scrollbar ─────────────────────────────────────────────── */`,
    `    ::-webkit-scrollbar { width: 8px; height: 8px; }`,
    `    ::-webkit-scrollbar-track { background: transparent; }`,
    `    ::-webkit-scrollbar-thumb {`,
    `      background: var(--border-subtle);`,
    `      border-radius: 999px;`,
    `    }`,
    `    ::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }`,
    ``,
    `    /* ─── Animations ────────────────────────────────────────────── */`,
    `    @keyframes fadeInUp {`,
    `      from { opacity: 0; transform: translateY(12px); }`,
    `      to   { opacity: 1; transform: translateY(0); }`,
    `    }`,
    `    @keyframes fadeIn {`,
    `      from { opacity: 0; }`,
    `      to   { opacity: 1; }`,
    `    }`,
    `    @keyframes slideIn {`,
    `      from { opacity: 0; transform: translateX(-8px); }`,
    `      to   { opacity: 1; transform: translateX(0); }`,
    `    }`,
    `    @keyframes shimmer {`,
    `      0%   { background-position: -200% 0; }`,
    `      100% { background-position: 200% 0; }`,
    `    }`,
    ``,
    `    /* ─── Memory Card ───────────────────────────────────────────── */`,
    `    .memory-card {`,
    `      background: var(--bg-card);`,
    `      border-radius: var(--radius-card);`,
    `      box-shadow: var(--shadow-card);`,
    `      padding: 2.5rem 2.5rem 2rem;`,
    `      border: 1px solid var(--border-card);`,
    `      backdrop-filter: blur(2px);`,
    `      animation: fadeInUp 0.5s ease-out;`,
    `      transition: box-shadow var(--transition-med);`,
    `      width: 100%;`,
    `      max-width: 1040px;`,
    `    }`,
    `    .memory-card:hover {`,
    `      box-shadow: var(--shadow-card-hover);`,
    `    }`,
    `    @media (max-width: 640px) {`,
    `      .memory-card { padding: 1.25rem 1.25rem 1rem; border-radius: 12px; }`,
    `    }`,
    ``,
    `    /* ─── Memory Header ─────────────────────────────────────────── */`,
    `    .memory-title {`,
    `      font-size: 1.65rem;`,
    `      font-weight: 800;`,
    `      color: var(--text-primary);`,
    `      margin-bottom: 0.25rem;`,
    `      letter-spacing: -0.025em;`,
    `      line-height: 1.3;`,
    `    }`,
    `    .memory-title::before {`,
    `      content: "";`,
    `      display: inline-block;`,
    `      width: 4px;`,
    `      height: 1.1em;`,
    `      background: var(--accent-gradient);`,
    `      border-radius: 999px;`,
    `      margin-right: 0.6rem;`,
    `      vertical-align: middle;`,
    `    }`,
    `    .memory-meta {`,
    `      font-size: 0.8rem;`,
    `      color: var(--text-muted);`,
    `      margin-bottom: 1.75rem;`,
    `      padding-bottom: 1.25rem;`,
    `      border-bottom: 1px solid var(--border-subtle);`,
    `      display: flex;`,
    `      align-items: center;`,
    `      gap: 0.5rem;`,
    `      flex-wrap: wrap;`,
    `    }`,
    `    .memory-meta .meta-dot {`,
    `      width: 4px; height: 4px;`,
    `      border-radius: 50%;`,
    `      background: var(--text-muted);`,
    `      opacity: 0.4;`,
    `    }`,
    `    .memory-meta .neuron-count {`,
    `      background: var(--bg-accent-soft);`,
    `      color: var(--text-accent);`,
    `      font-weight: 600;`,
    `      font-size: 0.7rem;`,
    `      padding: 0.15rem 0.55rem;`,
    `      border-radius: var(--radius-badge);`,
    `      letter-spacing: 0.02em;`,
    `    }`,
    ``,
    `    /* ─── Table of Contents ──────────────────────────────────────── */`,
    `    .toc {`,
    `      background: var(--bg-surface);`,
    `      border: 1px solid var(--border-subtle);`,
    `      border-radius: var(--radius-section);`,
    `      padding: 1.25rem 1.5rem;`,
    `      margin-bottom: 2rem;`,
    `      animation: fadeIn 0.5s ease-out both;`,
    `    }`,
    `    .toc-title {`,
    `      font-size: 0.7rem;`,
    `      font-weight: 700;`,
    `      text-transform: uppercase;`,
    `      letter-spacing: 0.08em;`,
    `      color: var(--text-muted);`,
    `      margin-bottom: 0.75rem;`,
    `    }`,
    `    .toc-list {`,
    `      list-style: none;`,
    `      display: flex;`,
    `      flex-direction: column;`,
    `      gap: 0.35rem;`,
    `    }`,
    `    .toc-item {`,
    `      margin: 0;`,
    `    }`,
    `    .toc-link {`,
    `      display: inline-flex;`,
    `      align-items: center;`,
    `      gap: 0.5rem;`,
    `      font-size: 0.82rem;`,
    `      font-weight: 500;`,
    `      color: var(--text-secondary);`,
    `      padding: 0.3rem 0.5rem;`,
    `      border-radius: 6px;`,
    `      transition: all var(--transition-fast);`,
    `      text-decoration: none;`,
    `    }`,
    `    .toc-link:hover {`,
    `      color: var(--text-accent);`,
    `      background: var(--bg-accent-soft);`,
    `      text-decoration: none;`,
    `    }`,
    `    .toc-badge {`,
    `      font-size: 0.5rem;`,
    `      font-weight: 700;`,
    `      text-transform: uppercase;`,
    `      background: var(--bg-card);`,
    `      color: var(--text-accent);`,
    `      border: 1px solid var(--border-subtle);`,
    `      padding: 0.1rem 0.4rem;`,
    `      border-radius: 4px;`,
    `      letter-spacing: 0.04em;`,
    `      line-height: 1.3;`,
    `      flex-shrink: 0;`,
    `    }`,
    `    @media (max-width: 640px) {`,
    `      .toc { padding: 1rem 1.15rem; }`,
    `    }`,
    ``,
    `    /* ─── Neuron Sections ────────────────────────────────────────── */`,
    `    .neuron-section {`,
    `      margin-bottom: 1.75rem;`,
    `      padding-bottom: 1.75rem;`,
    `      border-bottom: 1px solid var(--border-subtle);`,
    `      animation: fadeIn 0.4s ease-out both;`,
    `      scroll-margin-top: 1.5rem;`,
    `    }`,
    `    .neuron-section:last-child {`,
    `      border-bottom: none;`,
    `      margin-bottom: 0;`,
    `      padding-bottom: 0;`,
    `    }`,
    `    .neuron-section:target {`,
    `      animation: fadeInUp 0.35s ease-out;`,
    `    }`,
    ``,
    `    /* ─── Neuron Header ──────────────────────────────────────────── */`,
    `    .neuron-header {`,
    `      font-size: 0.7rem;`,
    `      font-weight: 700;`,
    `      text-transform: uppercase;`,
    `      letter-spacing: 0.06em;`,
    `      color: var(--text-accent);`,
    `      margin-bottom: 0.85rem;`,
    `      display: flex;`,
    `      align-items: center;`,
    `      gap: 0.5rem;`,
    `      animation: slideIn 0.35s ease-out both;`,
    `    }`,
    `    .neuron-format {`,
    `      font-size: 0.55rem;`,
    `      font-weight: 700;`,
    `      text-transform: uppercase;`,
    `      background: var(--accent-gradient);`,
    `      color: #ffffff;`,
    `      padding: 0.2rem 0.6rem;`,
    `      border-radius: var(--radius-badge);`,
    `      letter-spacing: 0.05em;`,
    `      box-shadow: var(--shadow-badge);`,
    `      line-height: 1.4;`,
    `    }`,
    ``,
    `    /* ─── Back to Index Link ─────────────────────────────────────── */`,
    `    .back-to-index {`,
    `      display: inline-flex;`,
    `      align-items: center;`,
    `      gap: 0.35rem;`,
    `      font-size: 0.7rem;`,
    `      font-weight: 500;`,
    `      color: var(--text-muted);`,
    `      margin-top: 1rem;`,
    `      padding: 0.25rem 0.5rem;`,
    `      border-radius: 6px;`,
    `      transition: all var(--transition-fast);`,
    `      text-decoration: none;`,
    `    }`,
    `    .back-to-index:hover {`,
    `      color: var(--text-accent);`,
    `      background: var(--bg-accent-soft);`,
    `      text-decoration: none;`,
    `    }`,
    ``,
    `    /* ─── Images ─────────────────────────────────────────────────── */`,
    `    img {`,
    `      max-width: 100%;`,
    `      height: auto;`,
    `      border-radius: 10px;`,
    `      box-shadow: 0 2px 8px rgba(0,0,0,0.06);`,
    `      transition: box-shadow var(--transition-fast);`,
    `    }`,
    `    img:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1); }`,
    ``,
    `    /* ─── Code Blocks ────────────────────────────────────────────── */`,
    `    pre {`,
    `      overflow-x: auto;`,
    `      border-radius: var(--radius-code);`,
    `      transition: box-shadow var(--transition-fast);`,
    `    }`,
    `    pre:hover {`,
    `      box-shadow: 0 4px 20px rgba(0,0,0,0.08);`,
    `    }`,
    ``,
    `    /* ─── Tables ─────────────────────────────────────────────────── */`,
    `    table {`,
    `      border-collapse: separate;`,
    `      border-spacing: 0;`,
    `      width: 100%;`,
    `      margin: 0.75rem 0;`,
    `      border-radius: 10px;`,
    `      overflow: hidden;`,
    `      border: 1px solid var(--border-subtle);`,
    `    }`,
    `    th, td {`,
    `      border: none;`,
    `      border-bottom: 1px solid var(--border-subtle);`,
    `      padding: 0.6rem 0.85rem;`,
    `      text-align: left;`,
    `      font-size: 0.9rem;`,
    `    }`,
    `    th {`,
    `      background: var(--bg-surface);`,
    `      font-weight: 600;`,
    `      color: var(--text-secondary);`,
    `      font-size: 0.8rem;`,
    `      text-transform: uppercase;`,
    `      letter-spacing: 0.04em;`,
    `    }`,
    `    tr:last-child td { border-bottom: none; }`,
    `    tr:hover td { background: var(--bg-card-hover); }`,
    ``,
    `    /* ─── Links ──────────────────────────────────────────────────── */`,
    `    a {`,
    `      color: var(--text-accent);`,
    `      text-decoration: none;`,
    `      transition: color var(--transition-fast);`,
    `    }`,
    `    a:hover {`,
    `      color: var(--text-accent-light);`,
    `      text-decoration: underline;`,
    `    }`,
    ``,
    `    /* ─── Blockquotes ────────────────────────────────────────────── */`,
    `    blockquote {`,
    `      border-left: 3px solid var(--text-accent);`,
    `      padding: 0.75rem 1rem;`,
    `      margin: 0.85rem 0;`,
    `      color: var(--text-secondary);`,
    `      background: var(--bg-surface);`,
    `      border-radius: 0 8px 8px 0;`,
    `      font-style: italic;`,
    `    }`,
    `    blockquote p:first-child { margin-top: 0; }`,
    `    blockquote p:last-child { margin-bottom: 0; }`,
    ``,
    `    /* ─── Inline Code ────────────────────────────────────────────── */`,
    `    .neuron-section code {`,
    `      font-family: var(--font-mono);`,
    `      font-size: 0.85em;`,
    `      background: var(--bg-surface);`,
    `      padding: 0.15em 0.4em;`,
    `      border-radius: 5px;`,
    `      color: var(--text-accent);`,
    `      border: 1px solid var(--border-subtle);`,
    `    }`,
    `    .neuron-section pre code {`,
    `      background: none;`,
    `      padding: 0;`,
    `      border: none;`,
    `      color: var(--text-primary);`,
    `    }`,
    ``,
    `    /* ─── Markdown Rendered Content ──────────────────────────────── */`,
    `    .neuron-section h1, .neuron-section h2, .neuron-section h3,`,
    `    .neuron-section h4 {`,
    `      margin-top: 1.35em;`,
    `      margin-bottom: 0.5em;`,
    `      font-weight: 700;`,
    `      color: var(--text-primary);`,
    `      line-height: 1.3;`,
    `    }`,
    `    .neuron-section h1 {`,
    `      font-size: 1.45rem;`,
    `      border-bottom: 1px solid var(--border-subtle);`,
    `      padding-bottom: 0.35em;`,
    `    }`,
    `    .neuron-section h2 { font-size: 1.2rem; }`,
    `    .neuron-section h3 { font-size: 1.05rem; }`,
    `    .neuron-section h4 { font-size: 0.95rem; }`,
    `    .neuron-section p {`,
    `      margin: 0.6em 0;`,
    `      color: var(--text-secondary);`,
    `    }`,
    `    .neuron-section ul, .neuron-section ol {`,
    `      padding-left: 1.5rem;`,
    `      margin: 0.6rem 0;`,
    `    }`,
    `    .neuron-section li { margin: 0.3rem 0; }`,
    `    .neuron-section hr {`,
    `      border: none;`,
    `      height: 1px;`,
    `      background: var(--border-subtle);`,
    `      margin: 1.5rem 0;`,
    `    }`,
    `  </style>`,
    `</head>`,
    `<body>`,
    `  <div class="memory-card">`,
    `    <div class="memory-title">${htmlEscape(memory?.name || "Memory Export")}</div>`,
    `    <div class="memory-meta">`,
    `      <span class="neuron-count">${sorted.length} neuron${sorted.length !== 1 ? "s" : ""}</span>`,
    `      ${memory?.createdAt ? `<span class="meta-dot"></span><span>${new Date(memory.createdAt).toLocaleDateString()}</span>` : ""}`,
    `    </div>`,
    `    ${tocHtml}`,
    `    ${sections.join("\n")}`,
    `  </div>`,
    `</body>`,
    `</html>`,
  ]
    .filter(Boolean)
    .join("\n");
}

// ─── View HTML in new tab ───────────────────────────────────────────────────

/**
 * Open the compiled neuron HTML document in a new browser tab.
 */
export function bkViewAsHtml(
  neurons: BKMemoryNeuron[],
  memory: BKMemory | null,
  getNeuronFormat: (neuronId: string) => RenderFormat,
): void {
  const html = buildStandaloneHtml(neurons, memory, getNeuronFormat);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

// ─── Download HTML ──────────────────────────────────────────────────────────

/**
 * Download the compiled neuron HTML document as an .html file.
 */
export function bkDownloadHtml(
  neurons: BKMemoryNeuron[],
  memoryId: string,
  memory: BKMemory | null,
  getNeuronFormat: (neuronId: string) => RenderFormat,
): void {
  const html = buildStandaloneHtml(neurons, memory, getNeuronFormat);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `neurons-${memoryId.slice(0, 8)}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
