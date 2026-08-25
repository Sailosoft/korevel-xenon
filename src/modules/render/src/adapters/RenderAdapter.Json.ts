// ───────────────────────────────────────────────────────────────────────────────
// Render Module — JSON Adapter
//
// Formats and syntax-highlights JSON content for export.
// React rendering is handled by RenderModule.View.tsx.
//
// The exported block defaults to a light theme (matching the light report
// documents it is embedded in) and falls back to a dark palette when the
// caller passes `{ darkMode: true }`.
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

const AMP = "&" + "amp;";
const QUOT = "&#34;";
const APOS = "&#039;";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, AMP)
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, QUOT)
    .replace(/'/g, APOS);
}

// ─── Colour palettes ───────────────────────────────────────────────────────────

interface JsonPalette {
  background: string;
  color: string;
  border: string;
  key: string;
  string: string;
  boolean: string;
  null: string;
  number: string;
  colon: string;
  invalidBg: string;
  invalidColor: string;
  invalidBorder: string;
}

/** Light palette — high-contrast on light report documents. */
const LIGHT_PALETTE: JsonPalette = {
  background: "#f8fafc",
  color: "#0f172a",
  border: "#e2e8f0",
  key: "#0550ae",
  string: "#a44100",
  boolean: "#0e7490",
  null: "#64748b",
  number: "#1a7f37",
  colon: "#64748b",
  invalidBg: "#fef2f2",
  invalidColor: "#dc2626",
  invalidBorder: "#fecaca",
};

/** Dark palette — One-Dark-style dark theme for `{ darkMode: true }` callers. */
const DARK_PALETTE: JsonPalette = {
  background: "#1a1a1a",
  color: "#abb2bf",
  border: "#3c3c3c",
  key: "#e06c75",
  string: "#98c379",
  boolean: "#56b6c2",
  null: "#858585",
  number: "#d19a66",
  colon: "#858585",
  invalidBg: "#3b1a1a",
  invalidColor: "#e06c75",
  invalidBorder: "#5c2a2a",
};

/**
 * Apply JSON syntax highlighting to escaped HTML content.
 * Operates on the escaped string (double quotes become `&#34;`).
 */
function highlightJson(escaped: string, p: JsonPalette): string {
  const q = QUOT;
  // Matches escaped content between double-quote entities, excluding the
  // `&#34;` quote entity itself (mirrors the YAML adapter's safe pattern).
  const inner = "(?:[^&#]|&#(?!34;)|&(?!quot;))*";
  return escaped
    // Keys: "key" :
    .replace(
      new RegExp("(" + q + inner + q + ")\\s*:", "g"),
      '<span style="color:' + p.key + ';">$1</span><span style="color:' + p.colon + ';">:</span>',
    )
    // String values
    .replace(
      new RegExp(":\\s*(" + q + inner + q + ")", "g"),
      ': <span style="color:' + p.string + ';">$1</span>',
    )
    // Booleans
    .replace(/:\s*(true|false)/g, ': <span style="color:' + p.boolean + ';">$1</span>')
    // Null
    .replace(/:\s*(null)/g, ': <span style="color:' + p.null + ';">$1</span>')
    // Numbers (integers, floats, exponents)
    .replace(
      /:\s*(-?\d+\.?\d*(?:e[+-]?\d+)?)/g,
      ': <span style="color:' + p.number + ';">$1</span>',
    );
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

  renderHtml(content: string, options?: RenderOptions): RenderHtmlResult {
    const dark = options?.darkMode === true;
    const p = dark ? DARK_PALETTE : LIGHT_PALETTE;
    const { formatted, valid, error } = formatJson(content);
    const escaped = escapeHtml(formatted);

    let html = "";

    if (!valid && error) {
      html += [
        `<div style="padding:0.5rem 1rem;background:${p.invalidBg};color:${p.invalidColor};`,
        `font-size:0.75rem;border-bottom:1px solid ${p.invalidBorder};font-family:monospace;">`,
        `Invalid JSON: ${escapeHtml(error)}`,
        `</div>`,
      ].join("");
    }

    html += [
      `<pre style="`,
      `  margin:0; padding:1rem;`,
      `  font-family:'JetBrains Mono','Fira Code','Cascadia Code','Consolas',monospace;`,
      `  font-size:0.8rem; line-height:1.6; overflow:auto;`,
      `  background:${p.background}; color:${p.color};`,
      `  border:1px solid ${p.border}; border-radius:8px;`,
      `"><code>`,
      highlightJson(escaped, p),
      `</code></pre>`,
    ].join("\n");

    return { raw: content, html, format: "json" };
  },
};
