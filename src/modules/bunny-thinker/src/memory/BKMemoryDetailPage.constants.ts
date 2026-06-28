// BKMemoryDetailPage.constants.ts
//
// HTML template for exporting neuron output as a standalone document.
// Uses `marked` to render full markdown, then enhances code blocks with
// a "Copy code" button and dark theme.

import { marked } from "marked";
import type { BKMemoryNeuron } from "./BKMemory.Types";

// ─── Escaping helpers ──────────────────────────────────────────────────

const ESCAPE_AMP = "&".concat("amp;");
const ESCAPE_LT = "&".concat("lt;");
const ESCAPE_GT = "&".concat("gt;");

const escapeHtml = (str: string): string =>
  str
    .replace(/&/g, ESCAPE_AMP)
    .replace(/</g, ESCAPE_LT)
    .replace(/>/g, ESCAPE_GT);

// ─── Post-process: enhance <pre><code> blocks with copy button ─────────

/**
 * Regex to find marked-generated <pre><code> blocks.
 *   Capture 1: attributes on <code> (e.g. class="language-ts")
 *   Capture 2: the code content (already HTML-escaped by marked)
 */
const CODE_BLOCK = /<pre><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g;

function enhanceCodeBlocks(html: string): string {
  return html.replace(CODE_BLOCK, (_, attrs: string, codeContent: string) => {
    const langMatch = attrs.match(/class="language-(\w+)"/);
    const lang = langMatch ? langMatch[1] : "";
    const langLabel = lang
      ? `<span class="code-lang">${escapeHtml(lang)}</span>`
      : "";

    return (
      `<div class="code-block">` +
      `<div class="code-block-header">` +
      langLabel +
      `<button class="copy-btn" onclick="(function(btn){` +
      `const c=btn.closest('.code-block').querySelector('code');` +
      `navigator.clipboard.writeText(c.textContent||'');` +
      `btn.textContent='Copied!';` +
      `setTimeout(function(){btn.textContent='Copy code';},2000);` +
      `})(this)">Copy code</button>` +
      `</div>` +
      `<pre><code${attrs}>${codeContent}</code></pre>` +
      `</div>`
    );
  });
}

// ─── Render a neuron value to full HTML (markdown → enhanced HTML) ────

function renderNeuronContent(value: string): string {
  const rawHtml = marked.parse(value, { async: false }) as string;
  return enhanceCodeBlocks(rawHtml);
}

// ─── Build HTML document from neurons ──────────────────────────────────

export function buildNeuronHtml(
  neurons: BKMemoryNeuron[],
  memoryId: string,
): string {
  const sorted = [...neurons].sort((a, b) => a.order - b.order);
  const count = neurons.length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Neuron Output</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: #f9fafb;
      padding: 2rem;
    }
    .container { max-width: 960px; margin: 0 auto; }
    h1 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
      padding-bottom: 0.75rem;
      border-bottom: 2px solid #e5e7eb;
    }
    .neuron {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
    }
    .neuron-header {
      font-size: 0.75rem;
      font-weight: 600;
      color: #7c3aed;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }
    .neuron-content {
      font-size: 0.875rem;
      word-break: break-word;
      color: #374151;
    }
    .neuron-content .text {
      white-space: pre-wrap;
    }

    /* ── Code block ──────────────────────────────────── */
    .code-block {
      margin: 0.75rem 0;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
      background: #1e293b;
    }
    .code-block-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.4rem 0.75rem;
      background: #334155;
      border-bottom: 1px solid #475569;
    }
    .code-lang {
      font-size: 0.7rem;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .copy-btn {
      font-size: 0.7rem;
      padding: 0.2rem 0.6rem;
      border: 1px solid #64748b;
      border-radius: 4px;
      background: transparent;
      color: #cbd5e1;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .copy-btn:hover {
      background: #475569;
      color: #f1f5f9;
    }
    .code-block pre {
      margin: 0;
      padding: 0.75rem;
      overflow-x: auto;
    }
    .code-block code {
      font-family: "SF Mono", "Fira Code", "Fira Mono", Menlo, Consolas, monospace;
      font-size: 0.8rem;
      line-height: 1.5;
      color: #e2e8f0;
      white-space: pre;
    }

    .separator {
      border: 0;
      border-top: 1px dashed #d1d5db;
      margin: 1rem 0;
    }
    .meta {
      font-size: 0.8rem;
      color: #6b7280;
      margin-top: 1rem;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Neuron Output &mdash; ${count} neuron${count !== 1 ? "s" : ""}</h1>
    ${sorted
      .map(
        (n) => `
    <div class="neuron">
      <div class="neuron-header">${escapeHtml(n.name || `Neuron #${n.order + 1}`)}</div>
      <div class="neuron-content">${renderNeuronContent(n.value)}</div>
    </div>`,
      )
      .join("")}
    <hr class="separator" />
    <div class="meta">Generated from memory ${memoryId.slice(0, 8)}</div>
  </div>
</body>
</html>`;
}
