// BSChat.Export.Template — Standalone HTML template for Bunny Studio chat export.
//
// Builds a self-contained HTML document containing ONLY the assistant (AI)
// responses of a conversation. User/system/error bubbles are excluded so the
// exported document reads as a clean AI-only transcript.
//
// Single Responsibility: Pure template markup + content rendering. No state,
// no side effects, no data fetching.
//
// Pattern reference: mirrors BKMemory.Template.ts (bunny-thinker) — a standalone
// document shell + per-section renderer with format-specific head injections.
//
// Theme: Bunny Studio red-accent design system.

import type { BSConversation } from "./BSChat.Types";
import type { RenderFormat } from "@/src/modules/render";

// ─── CDN Head Injections ─────────────────────────────────────────────────────

/** Head injections needed by specific render formats (CDN scripts etc.). */
export const BS_EXPORT_HEAD_INJECTIONS: Partial<Record<RenderFormat, string>> = {
  mermaid: [
    `<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>`,
    `<script>mermaid.initialize({ startOnLoad: true, theme: "default" });</script>`,
  ].join("\n"),
  mindmap: [
    `<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>`,
    `<script>mermaid.initialize({ startOnLoad: true, theme: "default" });</script>`,
  ].join("\n"),
  markdown: `<script src="https://cdn.jsdelivr.net/npm/marked@15/marked.min.js"></script>`,
  tailwind: `<script src="https://cdn.tailwindcss.com?plugins=typography"></script>`,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * HTML-escape a string so it displays as source code in the browser.
 */
export function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, "&#34;")
    .replace(/'/g, "&#039;");
}

/**
 * Replace common LaTeX math expressions with Unicode equivalents so marked can
 * render them (mirrors BKMemory.Template.ts).
 */
function replaceLatexMath(text: string): string {
  const latexMap: Record<string, string> = {
    "\\rightarrow": "\u2192",
    "\\leftarrow": "\u2190",
    "\\Rightarrow": "\u21d2",
    "\\Leftarrow": "\u21d0",
    "\\mapsto": "\u21a6",
    "\\implies": "\u27f9",
    "\\iff": "\u27fa",
    "\\to": "\u2192",
    "\\gets": "\u2190",
    "\\alpha": "\u03b1",
    "\\beta": "\u03b2",
    "\\gamma": "\u03b3",
    "\\delta": "\u03b4",
    "\\epsilon": "\u03b5",
    "\\zeta": "\u03b6",
    "\\eta": "\u03b7",
    "\\theta": "\u03b8",
    "\\iota": "\u03b9",
    "\\kappa": "\u03ba",
    "\\lambda": "\u03bb",
    "\\mu": "\u03bc",
    "\\nu": "\u03bd",
    "\\xi": "\u03be",
    "\\pi": "\u03c0",
    "\\rho": "\u03c1",
    "\\sigma": "\u03c3",
    "\\tau": "\u03c4",
    "\\upsilon": "\u03c5",
    "\\phi": "\u03c6",
    "\\chi": "\u03c7",
    "\\psi": "\u03c8",
    "\\omega": "\u03c9",
    "\\infty": "\u221e",
    "\\sum": "\u2211",
    "\\prod": "\u220f",
    "\\int": "\u222b",
    "\\partial": "\u2202",
    "\\nabla": "\u2207",
    "\\approx": "\u2248",
    "\\neq": "\u2260",
    "\\leq": "\u2264",
    "\\geq": "\u2265",
    "\\subset": "\u2282",
    "\\supset": "\u2283",
    "\\subseteq": "\u2286",
    "\\supseteq": "\u2287",
    "\\cup": "\u222a",
    "\\cap": "\u2229",
    "\\in": "\u2208",
    "\\notin": "\u2209",
    "\\emptyset": "\u2205",
    "\\forall": "\u2200",
    "\\exists": "\u2203",
    "\\cdot": "\u22c5",
    "\\times": "\u00d7",
    "\\div": "\u00f7",
    "\\pm": "\u00b1",
    "\\circ": "\u2218",
    "\\bullet": "\u2219",
    "\\rangle": "\u27e9",
    "\\langle": "\u27e8",
    "\\lbrace": "{",
    "\\rbrace": "}",
    "\\lvert": "|",
    "\\rvert": "|",
  };
  let result = text.replace(/\$([^$]+)\$/g, (_match, expr: string) => {
    let resolved = expr.trim();
    for (const [cmd, unicode] of Object.entries(latexMap)) {
      resolved = resolved.replace(
        new RegExp(cmd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        unicode,
      );
    }
    return resolved;
  });
  result = result.replace(/\$\$([^$]+)\$\$/g, (_match, expr: string) => {
    let resolved = expr.trim();
    for (const [cmd, unicode] of Object.entries(latexMap)) {
      resolved = resolved.replace(
        new RegExp(cmd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        unicode,
      );
    }
    return resolved;
  });
  return result;
}

/**
 * Parse CSV text into headers and rows (used for csv table rendering).
 */
function parseCsv(raw: string): { headers: string[]; rows: string[][] } {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => parseCsvLine(line));
  return { headers, rows };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Render CSV as a Tailwind-styled HTML table.
 */
function csvToTailwindTable(raw: string): string {
  const { headers, rows } = parseCsv(raw);
  if (headers.length === 0) {
    return '<div class="bs-csv-empty">No data</div>';
  }
  const parts: string[] = [];
  parts.push('<div class="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">');
  parts.push('<table class="w-full text-sm">');
  parts.push('<thead>');
  parts.push('<tr class="bg-gradient-to-r from-red-50 to-rose-50/50">');
  for (const header of headers) {
    parts.push(
      `<th class="px-4 py-3 text-left text-xs font-semibold text-red-700 uppercase tracking-wider border-b border-slate-200">${htmlEscape(header)}</th>`,
    );
  }
  parts.push("</tr></thead>");
  parts.push("<tbody>");
  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];
    const rowClass =
      ri % 2 === 0
        ? "bg-white transition-colors hover:bg-red-50/40"
        : "bg-slate-50/50 transition-colors hover:bg-red-50/40";
    parts.push(`<tr class="${rowClass}">`);
    for (let ci = 0; ci < Math.max(row.length, headers.length); ci++) {
      parts.push(
        `<td class="px-4 py-2.5 text-slate-700 border-b border-slate-100">${htmlEscape(row[ci] ?? "")}</td>`,
      );
    }
    parts.push("</tr>");
  }
  parts.push("</tbody></table></div>");
  return parts.join("\n");
}

/**
 * Derive a short outline label for an AI response (used for the HTML outline
 * links). Strips markdown/code fences and takes the first sentence (or ~64
 * chars), falling back to "AI response {index + 1}".
 */
function deriveOutlineLabel(content: string, index: number): string {
  const cleaned = content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~\-|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return `AI response ${index + 1}`;
  const sentence = cleaned.match(/^[^.!?\n]{1,64}[.!?]?/);
  const raw = (sentence ? sentence[0].trim() : cleaned).trim() || cleaned;
  return raw.length > 64 ? `${raw.slice(0, 61).trimEnd()}\u2026` : raw;
}

/**
 * Check if markdown content is primarily an image list. If so, returns the
 * extracted image info; otherwise null.
 */
function detectImageList(
  content: string,
): Array<{ src: string; alt: string }> | null {
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;

  const images: Array<{ src: string; alt: string }> = [];
  let imageCount = 0;

  for (const line of lines) {
    const mdMatch = line.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (mdMatch) {
      images.push({ src: mdMatch[2], alt: mdMatch[1] || "Image" });
      imageCount++;
      continue;
    }
    if (line.match(/^https?:\/\/.*\.(png|jpg|jpeg|gif|webp|svg|bmp)(\?.*)?$/i)) {
      images.push({ src: line, alt: "Image" });
      imageCount++;
      continue;
    }
    const htmlMatch = line.match(/^<img[^>]+src=["']([^"']+)["']/);
    if (htmlMatch) {
      const altMatch = line.match(/alt=["']([^"']+)["']/);
      images.push({
        src: htmlMatch[1],
        alt: altMatch ? altMatch[1] : "Image",
      });
      imageCount++;
      continue;
    }
  }

  return imageCount > 0 && imageCount >= lines.length * 0.5
    ? images
    : null;
}

// ─── Section Params ─────────────────────────────────────────────────────────

export interface BSChatExportSectionParams {
  /** 0-based index among the exported (assistant-only) responses */
  index: number;
  conversation: BSConversation;
}

export interface BSChatExportDocumentParams {
  title: string;
  /** AI-only conversations in display order */
  conversations: BSConversation[];
  /** Number of AI responses being exported */
  itemCount: number;
  accent: string;
  accentLight: string;
  accentSoft: string;
}

// ─── Section Builder ────────────────────────────────────────────────────────

const CODE_LIKE_FORMATS = new Set(["codeblock", "plain", "json", "yaml"]);

/**
 * Render a single assistant (AI) response to an HTML fragment.
 */
export function BSChatExportSection(params: BSChatExportSectionParams): string {
  const { index, conversation } = params;
  const format: RenderFormat = conversation.contentType || "markdown";
  const rawEscaped = htmlEscape(conversation.content);
  const slug = `bs-item-${index}`;
  const metaParts: string[] = [];
  if (conversation.provider) metaParts.push(conversation.provider);
  if (conversation.model) metaParts.push(conversation.model);
  if (conversation.createdDate) {
    try {
      metaParts.push(
        new Date(conversation.createdDate).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        }),
      );
    } catch {
      /* ignore bad dates */
    }
  }

  let bodyContent: string;

  if (CODE_LIKE_FORMATS.has(format)) {
    // ── Code-like formats: pre/code block ─────────────────────────────
    bodyContent = [
      `<pre class="bg-slate-100 p-4 rounded-xl overflow-x-auto text-sm font-mono leading-relaxed text-slate-800 border border-slate-200/60">`,
      `<code>${rawEscaped}</code>`,
      `</pre>`,
    ].join("\n");
  } else if (format === "markdown") {
    // ── Markdown (or image list disguised as markdown) ────────────────
    const imageList = detectImageList(conversation.content);
    if (imageList) {
      const imgs = imageList
        .map((img) => {
          return `<div class="flex flex-col items-center">
            <img src="${htmlEscape(img.src)}" alt="${htmlEscape(img.alt)}" class="w-full h-48 object-cover rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200" loading="lazy" />
            <p class="mt-1.5 text-xs text-slate-400 italic truncate w-full text-center">${htmlEscape(img.alt)}</p>
          </div>`;
        })
        .join("\n");
      bodyContent = `<div class="grid grid-cols-2 gap-4">${imgs}</div>`;
    } else {
      const latexProcessed = replaceLatexMath(conversation.content);
      const escapedContent = htmlEscape(latexProcessed);
      bodyContent = [
        `<pre id="bs-md-src-${index}" style="display:none" aria-hidden="true">${escapedContent}</pre>`,
        `<div id="bs-md-out-${index}" class="prose prose-slate max-w-none prose-headings:text-slate-900 prose-a:text-red-600 prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:font-mono prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:rounded-xl prose-pre:shadow-lg relative"></div>`,
      ].join("\n");
    }
  } else if (format === "mermaid" || format === "mindmap") {
    // ── Mermaid / mindmap diagram ─────────────────────────────────────
    const diagramMatch = conversation.content.match(/```mermaid\n?([\s\S]*?)```/);
    const diagram = diagramMatch
      ? diagramMatch[1].trim()
      : conversation.content.trim();
    bodyContent = [
      `<div class="bg-white border border-slate-200 rounded-xl p-4 my-2 shadow-sm">`,
      `  <div class="flex justify-center overflow-hidden relative" style="max-height:600px" id="bs-mermaid-container-${index}">`,
      `    <pre class="mermaid bg-transparent">${htmlEscape(diagram)}</pre>`,
      `  </div>`,
      `</div>`,
    ].join("\n");
  } else if (format === "csv") {
    // ── CSV as Tailwind-styled table ──────────────────────────────────
    bodyContent = csvToTailwindTable(conversation.content);
  } else if (format === "html" || format === "tailwind") {
    // ── Raw HTML / Tailwind HTML ──────────────────────────────────────
    bodyContent = [
      `<div class="bg-white border border-slate-200 rounded-xl p-4 my-2">`,
      `  ${conversation.content}`,
      `</div>`,
    ].join("\n");
  } else if (format === "image") {
    // ── Image wrapped in <img> ────────────────────────────────────────
    let imgSrc = conversation.content.trim();
    let imgAlt = "Image";
    const mdMatch = imgSrc.match(/!\[(.*?)\]\((.*?)\)/);
    if (mdMatch) {
      imgAlt = mdMatch[1] || "Image";
      imgSrc = mdMatch[2];
    }
    const htmlMatch = imgSrc.match(/<img[^>]+src=["']([^"']+)["']/);
    if (htmlMatch) {
      imgSrc = htmlMatch[1];
      const altMatch = imgSrc.match(/alt=["']([^"']+)["']/);
      if (altMatch) imgAlt = altMatch[1];
    }
    bodyContent = [
      `<div class="flex flex-col items-center my-4">`,
      `  <img src="${htmlEscape(imgSrc)}" alt="${htmlEscape(imgAlt)}" class="max-w-full h-auto rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200" loading="lazy" />`,
      `  <p class="mt-2 text-xs text-slate-400 italic">${htmlEscape(imgAlt)}</p>`,
      `</div>`,
    ].join("\n");
  } else {
    // ── Fallback: pre/code block ─────────────────────────────────────
    bodyContent = [
      `<pre class="bg-slate-100 p-4 rounded-xl overflow-x-auto text-sm font-mono text-slate-600 border border-slate-200">`,
      `<code>${rawEscaped}</code>`,
      `</pre>`,
    ].join("\n");
  }

  return [
    `<div class="bs-section" id="${slug}">`,
    `  <div class="bs-section-header">`,
    `    <div class="flex items-center gap-2 min-w-0">`,
    `      <span class="bs-badge">AI ${index + 1}</span>`,
    `      <span class="bs-format">${htmlEscape(format)}</span>`,
    `    </div>`,
    `    <div class="flex items-center gap-2 shrink-0">`,
    metaParts.length > 0
      ? `      <span class="bs-meta">${htmlEscape(metaParts.join(" · "))}</span>`
      : "",
    `      <button id="bs-copy-${index}" onclick="bsCopyRaw(${index})" class="bs-copy-btn" title="Copy this AI response">Copy</button>`,
    `    </div>`,
    `  </div>`,
    `  <pre id="bs-raw-${index}" style="display:none" aria-hidden="true">${rawEscaped}</pre>`,
    `  ${bodyContent}`,
    `  <div class="bs-section-footer">`,
    `    <a href="#bs-toc" class="bs-back-link" title="Jump back to the outline">&uarr; Back to outline</a>`,
    `  </div>`,
    `</div>`,
  ]
    .filter(Boolean)
    .join("\n");
}

// ─── Document Builder ───────────────────────────────────────────────────────

/**
 * Full standalone HTML document shell containing only the AI responses.
 */
export function BSChatExportDocument(
  params: BSChatExportDocumentParams,
): string {
  const {
    title,
    conversations,
    itemCount,
    accent,
    accentLight,
    accentSoft,
  } = params;

  const headInjectionsSet = new Set<string>();
  const sections = conversations.map((convo, i) => {
    const fmt = convo.contentType || "markdown";
    const injection = BS_EXPORT_HEAD_INJECTIONS[fmt];
    if (injection) headInjectionsSet.add(injection);
    return BSChatExportSection({ index: i, conversation: convo });
  });
  const headInjections = Array.from(headInjectionsSet).join("\n");

  // Outline (table of contents) — one shortcut link per AI response so the
  // user can jump straight to any message and back again.
  const outlineItems = conversations
    .map((convo, i) => {
      const label = deriveOutlineLabel(convo.content, i);
      return `        <li><a href="#bs-item-${i}"><span class="bs-toc-num">${i + 1}</span><span class="bs-toc-label">${htmlEscape(label)}</span></a></li>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${htmlEscape(title)}</title>
    <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
    ${headInjections}
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600;9..144,700&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        body {
          font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }
        code, pre { font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace; }

        :root {
          --accent: ${accent};
          --accent-light: ${accentLight};
          --accent-strong: #ff2d20;
          --accent-soft: ${accentSoft};
          --bg-page: #fbf8f6;
          --bg-card: #ffffff;
          --border-subtle: rgba(225, 29, 72, 0.08);
          --border-card: rgba(225, 29, 72, 0.12);
          --text-primary: #1a0a0c;
          --text-secondary: #57534e;
          --text-muted: #a8a29e;
          --accent-gradient: linear-gradient(135deg, ${accent}, #ff6a5e);
          --accent-radial: radial-gradient(120% 150% at 20% 0%, #ff6a5e 0%, ${accent} 55%, #d81e12 100%);
          --shadow-card: 0 1px 2px rgba(26,10,12,0.05), 0 10px 26px -14px rgba(225,29,72,0.18);
          --shadow-card-hover: 0 8px 22px -12px rgba(225,29,72,0.22), 0 24px 48px -24px rgba(225,29,72,0.2);
          --shadow-btn: inset 0 1px 0 rgba(255,255,255,0.35), 0 8px 20px -8px rgba(255,45,32,0.7);
        }

        /* ── Page ─────────────────────────────────────────────── */
        .bs-page {
          position: relative;
          min-height: 100vh;
          background:
            radial-gradient(1200px 600px at 50% -220px, rgba(255, 45, 32, 0.1), transparent 62%),
            var(--bg-page);
          color: var(--text-primary);
        }
        .bs-shell { max-width: 880px; margin: 0 auto; padding: 3rem 1.25rem 3.5rem; }

        /* ── Header / hero ────────────────────────────────────── */
        .bs-header { margin-bottom: 2.25rem; }
        .bs-eyebrow {
          display: inline-flex; align-items: center; gap: 0.55rem;
          font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.18em;
          color: var(--accent); margin-bottom: 0.9rem;
        }
        .bs-eyebrow::before {
          content: ""; width: 1.6rem; height: 2px; border-radius: 999px;
          background: var(--accent-gradient);
        }
        .bs-title {
          font-family: 'Fraunces', Georgia, serif;
          font-size: clamp(2rem, 5vw, 3rem);
          font-weight: 600; line-height: 1.06; letter-spacing: -0.02em;
          margin: 0;
          background: linear-gradient(120deg, #3b0a12 0%, var(--accent) 55%, #ff6a5e 100%);
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .bs-sub { margin-top: 1.1rem; display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
        .bs-count-badge {
          background: var(--accent-radial); color: #fff; font-weight: 700; font-size: 0.72rem;
          padding: 0.35rem 0.85rem; border-radius: 999px; letter-spacing: 0.02em;
          box-shadow: var(--shadow-btn);
        }
        .bs-sub-soft {
          font-size: 0.78rem; font-weight: 500; color: var(--text-muted);
          padding: 0.3rem 0.8rem; border-radius: 999px;
          border: 1px solid var(--border-card); background: rgba(255, 255, 255, 0.65);
        }

        /* ── Outline (TOC) ────────────────────────────────────── */
        .bs-toc {
          position: relative;
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          border-radius: 20px;
          box-shadow: var(--shadow-card);
          padding: 1.5rem 1.5rem 1.25rem;
          margin-bottom: 2rem;
          overflow: hidden;
        }
        .bs-toc::before {
          content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: var(--accent-radial);
        }
        .bs-toc-title {
          display: flex; align-items: center; gap: 0.5rem;
          font-size: 0.66rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.14em;
          color: var(--accent); margin-bottom: 1rem;
        }
        .bs-toc-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.2rem; }
        .bs-toc-list li { margin: 0; }
        .bs-toc-list a {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.5rem 0.6rem; border-radius: 12px;
          color: var(--text-secondary); font-size: 0.84rem; font-weight: 500; text-decoration: none;
          transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
        }
        .bs-toc-list a:hover {
          background: linear-gradient(135deg, rgba(255, 45, 32, 0.07), rgba(255, 45, 32, 0.03));
          color: var(--accent); transform: translateX(3px);
        }
        .bs-toc-num {
          flex-shrink: 0; font-size: 0.66rem; font-weight: 800; color: #fff;
          background: var(--accent-radial);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.3), 0 5px 12px -5px rgba(255,45,32,0.65);
          width: 1.6rem; height: 1.6rem;
          display: inline-flex; align-items: center; justify-content: center; border-radius: 999px;
          transition: transform 0.18s ease;
        }
        .bs-toc-list a:hover .bs-toc-num { transform: scale(1.1); }
        .bs-toc-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        /* ── Response sections ────────────────────────────────── */
        .bs-section {
          position: relative;
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          border-radius: 20px;
          box-shadow: var(--shadow-card);
          padding: 1.75rem 1.75rem 1.5rem;
          margin-bottom: 1.75rem;
          scroll-margin-top: 1rem;
          transition: box-shadow 0.25s ease;
        }
        .bs-section:hover { box-shadow: var(--shadow-card-hover); }
        .bs-section::after {
          content: ""; position: absolute; left: 0; top: 1.5rem; bottom: 1.5rem; width: 3px;
          border-radius: 999px; background: var(--accent-gradient); opacity: 0.55;
        }
        .bs-section:last-child { margin-bottom: 0; }
        .bs-section-header { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 1.1rem; }
        .bs-badge {
          font-family: 'Fraunces', Georgia, serif;
          font-size: 0.78rem; font-weight: 600; letter-spacing: 0.02em; color: #fff;
          background: var(--accent-radial);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.3), 0 6px 16px -7px rgba(255,45,32,0.8);
          padding: 0.3rem 0.85rem; border-radius: 999px; white-space: nowrap;
        }
        .bs-format {
          font-size: 0.6rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em;
          color: var(--accent); background: var(--accent-soft);
          border: 1px solid color-mix(in srgb, var(--accent) 16%, transparent);
          padding: 0.22rem 0.6rem; border-radius: 999px; white-space: nowrap;
        }
        .bs-meta { font-size: 0.68rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .bs-copy-btn {
          display: inline-flex; align-items: center; gap: 0.35rem;
          font-size: 0.66rem; font-weight: 700; color: #fff; border: none;
          background: var(--accent-radial);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.3), 0 6px 16px -7px rgba(255,45,32,0.8);
          padding: 0.35rem 0.7rem; border-radius: 999px; cursor: pointer; white-space: nowrap;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .bs-copy-btn:hover { transform: translateY(-1px); box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), 0 10px 22px -8px rgba(255,45,32,0.9); }
        .bs-copy-btn:active { transform: translateY(0); }

        /* ── Rendered content ─────────────────────────────────── */
        .bs-section img { max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 6px 18px -10px rgba(26,10,12,0.25); }
        .bs-section pre { overflow-x: auto; border-radius: 12px; }
        .bs-section table { border-collapse: separate; border-spacing: 0; width: 100%; margin: 0.75rem 0; border-radius: 12px; overflow: hidden; border: 1px solid var(--border-subtle); }
        .bs-section a { color: var(--accent); text-decoration: none; }
        .bs-section a:hover { text-decoration: underline; }
        .bs-section blockquote {
          border-left: 3px solid var(--accent); padding: 0.7rem 1rem; margin: 0.85rem 0;
          color: var(--text-secondary); background: var(--accent-soft); border-radius: 0 10px 10px 0; font-style: italic;
        }
        .bs-section h1, .bs-section h2, .bs-section h3, .bs-section h4 {
          font-family: 'Fraunces', Georgia, serif;
          margin-top: 1.3em; margin-bottom: 0.5em; font-weight: 600; color: var(--text-primary);
          line-height: 1.25; letter-spacing: -0.01em;
        }
        .bs-section h1 { font-size: 1.55rem; }
        .bs-section h2 { font-size: 1.3rem; }
        .bs-section h3 { font-size: 1.12rem; }
        .bs-section h4 { font-size: 1rem; }
        .bs-section p { margin: 0.65em 0; color: var(--text-secondary); line-height: 1.75; }
        .bs-section ul, .bs-section ol { padding-left: 1.5rem; margin: 0.7rem 0; }
        .bs-section li { margin: 0.35rem 0; line-height: 1.7; }
        .bs-csv-empty { text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 1.5rem 0; font-style: italic; }

        /* ── Section footer ───────────────────────────────────── */
        .bs-section-footer {
          margin-top: 1.1rem; padding-top: 0.85rem;
          border-top: 1px dashed var(--border-subtle);
          display: flex; justify-content: flex-end;
        }
        .bs-back-link {
          display: inline-flex; align-items: center; gap: 0.3rem;
          font-size: 0.7rem; font-weight: 600; color: var(--text-muted); text-decoration: none;
          transition: color 0.18s ease, gap 0.18s ease;
        }
        .bs-back-link:hover { color: var(--accent); gap: 0.55rem; }

        /* ── Footer ───────────────────────────────────────────── */
        .bs-footer {
          margin-top: 3rem; padding-top: 1.4rem;
          border-top: 1px solid var(--border-subtle);
          text-align: center; color: var(--text-muted); font-size: 0.7rem; font-family: 'JetBrains Mono', monospace;
        }

        @media (max-width: 640px) {
          .bs-shell { padding: 2rem 0.95rem 2.5rem; }
          .bs-title { font-size: 1.7rem; }
          .bs-section { padding: 1.25rem 1.1rem 1.1rem; }
          .bs-section-header { flex-wrap: wrap; }
        }
    </style>
</head>
<body class="bs-page antialiased">
    <div class="bs-shell">
        <header class="bs-header">
            <div class="bs-eyebrow">Bunny Studio &middot; AI transcript</div>
            <h1 class="bs-title">${htmlEscape(title)}</h1>
            <div class="bs-sub">
                <span class="bs-count-badge">AI responses: ${itemCount}</span>
                <span class="bs-sub-soft">Exported from Bunny Studio</span>
            </div>
        </header>

        ${itemCount > 0
          ? `<nav class="bs-toc" id="bs-toc">
            <div class="bs-toc-title">Outline &mdash; jump to any AI response</div>
            <ul class="bs-toc-list">
${outlineItems}
            </ul>
        </nav>`
          : ""}

        <main>
            ${itemCount === 0
              ? `<div class="bs-section" style="text-align:center;color:var(--text-muted);font-style:italic;">No AI responses to export yet.</div>`
              : sections.join("\n")}
        </main>

        <footer class="bs-footer">
            &copy; ${new Date().getFullYear()} ${htmlEscape(title)} &middot; Generated with Bunny Studio
        </footer>
    </div>

    <script>
    // ── Markdown rendering at load time (marked CDN) ───────────────────
    (function(){
      var srcs = document.querySelectorAll('[id^="bs-md-src-"]');
      srcs.forEach(function(src){
        var idx = src.id.replace('bs-md-src-', '');
        var out = document.getElementById('bs-md-out-' + idx);
        if(!out) return;
        var raw = src.textContent || src.innerText || '';
        var fallback = function(){
          out.innerHTML = '<pre class="bg-slate-100 p-4 rounded-xl overflow-x-auto text-sm">' + raw.replace(/</g, '<') + '</pre>';
        };
        try {
          if(typeof marked !== 'undefined' && marked.parse){
            out.innerHTML = marked.parse(raw);
          } else {
            fallback();
          }
        } catch(e){ fallback(); }
      });
    })();

    // ── Per-section raw copy ──────────────────────────────────────────
    function bsCopyRaw(i){
      var el = document.getElementById('bs-raw-' + i);
      var txt = el ? (el.textContent || el.innerText || '') : '';
      if(navigator.clipboard && txt){
        navigator.clipboard.writeText(txt);
      }
      var b = document.getElementById('bs-copy-' + i);
      if(b){
        var orig = b.innerHTML;
        b.innerHTML = '\\u2713 Copied!';
        setTimeout(function(){ b.innerHTML = orig; }, 1500);
      }
    }
    </script>
</body>
</html>`;
}

// ─── Convenience helpers ─────────────────────────────────────────────────────

/** Filter conversations down to the assistant (AI) responses only. */
export function assistantOnlyConversations(
  conversations: BSConversation[],
): BSConversation[] {
  return conversations.filter(
    (c) => c.type === "assistant" && !c.isError,
  );
}

/** Separator placed between AI responses in the plain-text transcript. */
export const BS_EXPORT_TEXT_SEPARATOR = "\n\n=====\n\n";

/** Plain-text transcript of only the AI responses. */
export function assistantOnlyText(conversations: BSConversation[]): string {
  return assistantOnlyConversations(conversations)
    .map((c) => c.content)
    .join(BS_EXPORT_TEXT_SEPARATOR);
}

/**
 * Build the complete standalone HTML document for an AI-only chat export.
 */
export function buildChatExportHtml(
  conversations: BSConversation[],
  title: string,
): string {
  const aiOnly = assistantOnlyConversations(conversations);
  return BSChatExportDocument({
    title: title || "Chat Export",
    conversations: aiOnly,
    itemCount: aiOnly.length,
    accent: "#ff2d20",
    accentLight: "#ff6a5e",
    accentSoft: "#ffebe9",
  });
}
