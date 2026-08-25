// ───────────────────────────────────────────────────────────────────────────────
// Render Module — YAML Adapter
//
// Formats and syntax-highlights YAML content for export.
// React rendering is handled by RenderModule.View.tsx (CodeMirror 6 viewer).
//
// The exported block defaults to a light theme (matching the light report
// documents it is embedded in) and falls back to a dark palette when the
// caller passes `{ darkMode: true }`.
// ───────────────────────────────────────────────────────────────────────────────

import type { RenderAdapter, RenderHtmlResult, RenderOptions } from "../RenderModule.Types";

const AMP = "&" + "amp;";
const LT = "&" + "lt;";
const GT = "&" + "gt;";
const QUOT = "&#34;";
const APOS = "&#039;";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, AMP)
    .replace(/</g, LT)
    .replace(/>/g, GT)
    .replace(/"/g, QUOT)
    .replace(/'/g, APOS);
}

// ─── Colour palettes ───────────────────────────────────────────────────────────

interface YamlPalette {
  background: string;
  color: string;
  border: string;
  comment: string;
  directive: string;
  anchor: string;
  tag: string;
  string: string;
  boolean: string;
  number: string;
  key: string;
}

/** Light palette — high-contrast on light report documents. */
const LIGHT_PALETTE: YamlPalette = {
  background: "#f8fafc",
  color: "#0f172a",
  border: "#e2e8f0",
  comment: "#22863a",
  directive: "#8250df",
  anchor: "#9a6700",
  tag: "#8250df",
  string: "#a44100",
  boolean: "#0e7490",
  number: "#1a7f37",
  key: "#0550ae",
};

/** Dark palette — VSCode-style dark theme for `{ darkMode: true }` callers. */
const DARK_PALETTE: YamlPalette = {
  background: "#1e1e1e",
  color: "#d4d4d4",
  border: "#3c3c3c",
  comment: "#6a9955",
  directive: "#c586c0",
  anchor: "#dcdcaa",
  tag: "#c586c0",
  string: "#ce9178",
  boolean: "#569cd6",
  number: "#b5cea8",
  key: "#9cdcfe",
};

/**
 * Apply YAML syntax highlighting to escaped HTML content.
 *
 * Highlights:
 *   - Comments (# ...)          → green
 *   - Keys (word:)              → blue
 *   - Strings ("...", '...')    → brown/orange
 *   - Booleans & null           → teal
 *   - Numbers                   → green
 *   - Anchors (&word, *word)    → amber
 *   - Tags (!tag)               → purple
 *   - Directives (%YAML, ---)   → purple
 */
function highlightYaml(escaped: string, p: YamlPalette): string {
  const lines = escaped.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    let hl = line;

    // Full-line comment (no key before it)
    if (/^\s*#/.test(hl)) {
      hl = '<span style="color:' + p.comment + ';">' + hl + '</span>';
      result.push(hl);
      continue;
    }

    // Directives / document markers
    hl = hl.replace(
      /^(%YAML\s[\d.]+|%TAG\s\S+|\.\.\.|---)$/,
      '<span style="color:' + p.directive + ';">$1</span>',
    );

    // Anchors and aliases
    hl = hl.replace(
      new RegExp("(" + AMP + "\\w+|\\*\\w+)", "g"),
      '<span style="color:' + p.anchor + ';">$1</span>',
    );

    // Tags
    hl = hl.replace(
      new RegExp("(!" + LT + "[\\w./-]+" + GT + "|!\\S+)", "g"),
      '<span style="color:' + p.tag + ';">$1</span>',
    );

    // Inline comments (after a value)
    hl = hl.replace(
      /(\s#\s.*$)/,
      '<span style="color:' + p.comment + ';">$1</span>',
    );

    // Double-quoted strings
    hl = hl.replace(
      new RegExp("(" + QUOT + "(?:[^&#]|&#(?!34;)|&(?!quot;))*" + QUOT + ")", "g"),
      '<span style="color:' + p.string + ';">$1</span>',
    );

    // Single-quoted strings
    hl = hl.replace(
      new RegExp("(" + APOS + "(?:[^&#]|&#(?!39;))*" + APOS + ")", "g"),
      '<span style="color:' + p.string + ';">$1</span>',
    );

    // Booleans and null (standalone values)
    hl = hl.replace(
      /\b(true|false|null|yes|no|on|off)\b/g,
      '<span style="color:' + p.boolean + ';">$1</span>',
    );

    // Numbers (integers, floats, hex)
    hl = hl.replace(
      /\b(-?\d+\.?\d*(?:e[+-]?\d+)?|0x[0-9a-fA-F]+)\b/g,
      '<span style="color:' + p.number + ';">$1</span>',
    );

    // Keys (word followed by colon, at start of line or after indent)
    hl = hl.replace(
      /^(\s*)([\w.-]+)(\s*:)/gm,
      '$1<span style="color:' + p.key + ';">$2</span>$3',
    );

    result.push(hl);
  }

  return result.join("\n");
}

/**
 * YAML Adapter
 *
 * Displays YAML content with syntax highlighting for export.
 * In the React view layer, YAML is rendered with a CodeMirror 6 viewer
 * with syntax highlighting, line numbers, and folding.
 */
export const yamlAdapter: RenderAdapter = {
  format: "yaml",
  displayName: "YAML",
  description: "Displays YAML content with syntax highlighting.",

  renderHtml(content: string, options?: RenderOptions): RenderHtmlResult {
    const dark = options?.darkMode === true;
    const p = dark ? DARK_PALETTE : LIGHT_PALETTE;
    const escaped = escapeHtml(content);
    const highlighted = highlightYaml(escaped, p);

    const html = [
      '<pre style="',
      'margin:0;',
      'padding:1rem;',
      "font-family:'JetBrains Mono','Fira Code','Cascadia Code','Consolas',monospace;",
      'font-size:0.8rem;',
      'line-height:1.6;',
      'overflow:auto;',
      'background:' + p.background + ';',
      'color:' + p.color + ';',
      'border:1px solid ' + p.border + ';',
      'border-radius:8px;',
      'white-space:pre-wrap;',
      'word-break:break-word;',
      '">',
      '<code>' + highlighted + '</code>',
      '</pre>',
    ].join("");

    return {
      raw: content,
      html,
      format: "yaml",
    };
  },
};
