// ───────────────────────────────────────────────────────────────────────────────
// Render Module — YAML Adapter
//
// Formats and syntax-highlights YAML content for export.
// React rendering is handled by RenderModule.View.tsx (Monaco editor).
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

/**
 * Apply basic YAML syntax highlighting to escaped HTML content.
 *
 * Highlights:
 *   - Comments (# ...)          → dim green
 *   - Keys (word:)              → light blue
 *   - Strings ("...", '...')    → orange
 *   - Booleans & null           → cyan
 *   - Numbers                   → light green
 *   - Anchors (&word, *word)    → yellow
 *   - Tags (!tag)               → pink
 *   - Directives (%YAML, ---)   → magenta
 */
function highlightYaml(escaped: string): string {
  const lines = escaped.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    let hl = line;

    // Full-line comment (no key before it)
    if (/^\s*#/.test(hl)) {
      hl = '<span style="color:#6a9955;">' + hl + '</span>';
      result.push(hl);
      continue;
    }

    // Directives / document markers
    hl = hl.replace(
      /^(%YAML\s[\d.]+|%TAG\s\S+|\.\.\.|---)$/,
      '<span style="color:#c586c0;">$1</span>',
    );

    // Anchors and aliases
    hl = hl.replace(
      new RegExp("(" + AMP + "\\w+|\\*\\w+)", "g"),
      '<span style="color:#dcdcaa;">$1</span>',
    );

    // Tags
    hl = hl.replace(
      new RegExp("(!" + LT + "[\\w./-]+" + GT + "|!\\S+)", "g"),
      '<span style="color:#c586c0;">$1</span>',
    );

    // Inline comments (after a value)
    hl = hl.replace(
      /(\s#\s.*$)/,
      '<span style="color:#6a9955;">$1</span>',
    );

    // Double-quoted strings
    hl = hl.replace(
      new RegExp("(" + QUOT + "(?:[^&#]|&#(?!34;)|&(?!quot;))*" + QUOT + ")", "g"),
      '<span style="color:#ce9178;">$1</span>',
    );

    // Single-quoted strings
    hl = hl.replace(
      new RegExp("(" + APOS + "(?:[^&#]|&#(?!39;))*" + APOS + ")", "g"),
      '<span style="color:#ce9178;">$1</span>',
    );

    // Booleans and null (standalone values)
    hl = hl.replace(
      /\b(true|false|null|yes|no|on|off)\b/g,
      '<span style="color:#569cd6;">$1</span>',
    );

    // Numbers (integers, floats, hex)
    hl = hl.replace(
      /\b(-?\d+\.?\d*(?:e[+-]?\d+)?|0x[0-9a-fA-F]+)\b/g,
      '<span style="color:#b5cea8;">$1</span>',
    );

    // Keys (word followed by colon, at start of line or after indent)
    hl = hl.replace(
      /^(\s*)([\w.-]+)(\s*:)/gm,
      '$1<span style="color:#9cdcfe;">$2</span>$3',
    );

    result.push(hl);
  }

  return result.join("\n");
}

/**
 * YAML Adapter
 *
 * Displays YAML content with syntax highlighting for export.
 * In the React view layer, YAML is rendered with a Monaco editor
 * for a full code-editing experience with syntax highlighting.
 */
export const yamlAdapter: RenderAdapter = {
  format: "yaml",
  displayName: "YAML",
  description: "Displays YAML content with syntax highlighting.",

  renderHtml(content: string, _options?: RenderOptions): RenderHtmlResult {
    const escaped = escapeHtml(content);
    const highlighted = highlightYaml(escaped);

    const html = [
      '<pre style="',
      'margin:0;',
      'padding:1rem;',
      "font-family:'JetBrains Mono','Fira Code','Cascadia Code','Consolas',monospace;",
      'font-size:0.8rem;',
      'line-height:1.6;',
      'overflow:auto;',
      'background:#1e1e1e;',
      'color:#d4d4d4;',
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
