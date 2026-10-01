// BDArchitectureExport.ts — export architecture documents to Markdown or a
// standalone, Tailwind-styled HTML document.

import { marked } from "marked";
import type { BDArchitectureRecord } from "../../BDDomain.Types";
import { sectionMarkdown } from "./BDArchitecture.Types";

export function toArchitectureMarkdown(record: BDArchitectureRecord): string {
  const lines: string[] = [`# ${record.name}`];
  if (record.summary) lines.push("", `_${record.summary}_`);
  lines.push(
    "",
    `**Type:** ${record.type}  `,
    `**Status:** ${record.status}`,
  );
  if (record.version) lines.push(`**Version:** ${record.version}`);
  if (record.content) lines.push("", record.content);
  for (const section of record.sections ?? []) {
    lines.push("", sectionMarkdown(section));
  }
  return lines.join("\n");
}

const AMP_ENTITY = "&amp;";
const LT_ENTITY = "&lt;";
const GT_ENTITY = "&gt;";
const QUOT_ENTITY = "&quot;";
const APOS_ENTITY = "&#039;";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, AMP_ENTITY)
    .replace(/</g, LT_ENTITY)
    .replace(/>/g, GT_ENTITY)
    .replace(/"/g, QUOT_ENTITY)
    .replace(/'/g, APOS_ENTITY);
}

/**
 * Standalone HTML `<head>` for the exported document.
 *
 * Loads the Tailwind CDN with the typography plugin (mirrors
 * `BFlowExport.TailwindService`) plus a small theme/config and a style block
 * for the surface, prose, and print treatment.
 */
const REPORT_HEAD = `
<script src="https://cdn.tailwindcss.com?plugins=typography"></script>
<script>
  tailwind.config = {
    theme: {
      extend: {
        fontFamily: {
          sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
          mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
          display: ['Space Grotesk', 'Inter', 'sans-serif'],
        },
        colors: {
          brand: '#1565c0',
        },
      },
    },
  };
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root { color-scheme: light; }
  html { scroll-behavior: smooth; }
  body {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    background-color: #f6f8fb;
    background-image:
      radial-gradient(60rem 40rem at 6% -14%, rgba(21,101,192,0.10), transparent 60%),
      radial-gradient(50rem 36rem at 108% 2%, rgba(59,130,246,0.10), transparent 60%);
    background-attachment: fixed;
    color: #0f172a;
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }
  .font-display { font-family: 'Space Grotesk', 'Inter', sans-serif; }
  .font-mono, pre, code { font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace; }
  .glass {
    background: #ffffff;
    border: 1px solid rgba(15,23,42,0.08);
    box-shadow: 0 8px 32px rgba(15,23,42,0.06);
  }
  @keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
  .rise { animation: rise 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }

  /* Markdown prose — parsed with marked (GFM) */
  .arch-prose { line-height: 1.75; }
  .arch-prose h1, .arch-prose h2, .arch-prose h3, .arch-prose h4 {
    color: #0f172a; font-weight: 600; margin: 1.4em 0 0.5em;
    font-family: 'Space Grotesk', 'Inter', sans-serif; line-height: 1.25;
  }
  .arch-prose h1 { font-size: 1.75rem; }
  .arch-prose h2 { font-size: 1.4rem; }
  .arch-prose h3 { font-size: 1.15rem; }
  .arch-prose h4 { font-size: 1rem; }
  .arch-prose p, .arch-prose li { color: #334155; }
  .arch-prose p { margin: 0.7em 0; }
  .arch-prose ul, .arch-prose ol { padding-left: 1.5rem; margin: 0.7em 0; }
  .arch-prose ul { list-style: disc; }
  .arch-prose ol { list-style: decimal; }
  .arch-prose li { margin: 0.3em 0; }
  .arch-prose strong { color: #0f172a; }
  .arch-prose em { color: #475569; }
  .arch-prose a { color: #1565c0; text-decoration: none; }
  .arch-prose a:hover { text-decoration: underline; }
  .arch-prose blockquote {
    border-left: 3px solid #bfdbfe; padding-left: 1rem;
    color: #64748b; margin: 0.9em 0;
  }
  .arch-prose hr { border: 0; border-top: 1px solid #e2e8f0; margin: 1.6em 0; }
  .arch-prose code {
    background: #eff6ff; color: #1d4ed8;
    padding: 0.15em 0.4em; border-radius: 0.375rem; font-size: 0.85em;
  }
  .arch-prose pre {
    background: #0f172a; border: 1px solid rgba(15,23,42,0.1);
    padding: 1rem; border-radius: 0.75rem; overflow-x: auto; margin: 0.9em 0;
  }
  .arch-prose pre code { background: transparent; padding: 0; color: #e2e8f0; }
  .arch-prose table { border-collapse: collapse; width: 100%; margin: 1.1em 0; font-size: 0.9rem; }
  .arch-prose th, .arch-prose td { border: 1px solid #e2e8f0; padding: 0.5rem 0.75rem; text-align: left; }
  .arch-prose th { background: #f1f5f9; font-weight: 600; color: #0f172a; }
  .arch-prose tbody tr:nth-child(even) { background: #f8fafc; }
  .arch-prose img { max-width: 100%; height: auto; border-radius: 8px; }

  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-thumb { background: rgba(15,23,42,0.18); border-radius: 9999px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(15,23,42,0.30); }
  ::-webkit-scrollbar-track { background: transparent; }

  @media print {
    body { background: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    .glass { box-shadow: none; border-color: #e2e8f0; }
  }
</style>`.trim();

/** A small metadata pill rendered in the header. */
function metaChip(label: string, value: string): string {
  return [
    `<span class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">`,
    `<span class="font-semibold text-slate-500">${escapeHtml(label)}</span>`,
    `${escapeHtml(value)}`,
    `</span>`,
  ].join("");
}

export function toArchitectureHtml(record: BDArchitectureRecord): string {
  const markdown = toArchitectureMarkdown(record);
  const body = marked.parse(markdown, { gfm: true }) as string;
  const generatedAt = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const chips = [
    metaChip("Type", record.type),
    metaChip("Status", record.status),
    record.version ? metaChip("Version", record.version) : "",
    metaChip(
      "Sections",
      String((record.sections ?? []).length),
    ),
  ]
    .filter(Boolean)
    .join("\n        ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(record.name)}</title>
  ${REPORT_HEAD}
</head>
<body class="antialiased">
  <div class="mx-auto max-w-4xl px-4 pt-10 pb-16 sm:px-6 lg:px-8">
    <header class="glass relative rise mb-8 rounded-3xl p-8">
      <button onclick="window.print()" class="no-print absolute right-6 top-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1565c0] to-[#3b82f6] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-opacity hover:opacity-90">
        Print / Save PDF
      </button>
      <div class="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1565c0]">
        <span class="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-[#1565c0] to-[#3b82f6]"></span>
        Architecture Document
      </div>
      <h1 class="font-display mt-5 bg-gradient-to-r from-slate-900 via-[#1565c0] to-[#3b82f6] bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
        ${escapeHtml(record.name)}
      </h1>
      ${
        record.summary
          ? `<p class="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">${escapeHtml(record.summary)}</p>`
          : ""
      }
      <div class="mt-6 flex flex-wrap gap-2.5">
        ${chips}
      </div>
    </header>

    <main class="glass rise rounded-3xl p-8">
      <article class="arch-prose max-w-none">
        ${body}
      </article>
    </main>

    <footer class="mt-10 pt-6 text-center">
      <p class="text-xs text-slate-400">Generated ${escapeHtml(generatedAt)} · BunnyDev Architecture Design</p>
    </footer>
  </div>
</body>
</html>`;
}
