/**
 * BFlowExport.TailwindService — Pipeline run HTML export.
 *
 * Generates a standalone HTML document for a pipeline run, styled as a modern,
 * beautiful website report (light theme with dark code panels for contrast).
 *
 * Output rendering
 *   - `markdown` output is parsed with **marked** (GFM): fenced code blocks keep
 *     their `#` content literal (they are never re-interpreted as headings) and
 *     tables render correctly.
 *   - Every other output type (html, json, csv, yaml, plain, tailwind) is
 *     rendered through the shared Render module — the same engine that powers
 *     `RenderView` in the UI — so each type is presented consistently.
 *   - `html` output embeds the actual HTML (fragment, or complete documents
 *     reduced to their `<body>` content with their `<head>` styles preserved).
 */

import { marked } from "marked";
import {
  RenderEngine,
  registerBuiltinAdapters,
} from "@/src/modules/render";
import type { RenderFormat } from "@/src/modules/render";
import type {
  BFlowWorkflowReport,
  BFlowWorkflowJob,
  BFlowStepOutputType,
} from "../workflow/BFlowWorkflow.Types";
import type { BFlowJobRun, BFlowStepRun } from "../run/BFlowRun.Types";

// ─── Types ──────────────────────────────────────────────────────────

export interface BFlowTailwindExportOptions {
  /** Include resolved system/user prompts per step. Defaults to false. */
  includeResolvedPrompts?: boolean;
  /** Include resolved input values per step. Defaults to true. */
  includeResolvedInputs?: boolean;
  /** Custom title for the report. */
  title?: string;
  /** Include the pipeline description. Defaults to true. */
  includeDescription?: boolean;
  /**
   * Workflow job definitions — used internally to resolve step output types.
   * Passed through from BFlowTailwindExportInput.jobs.
   */
  jobs?: BFlowWorkflowJob[];
}

export interface BFlowTailwindExportInput {
  /** Name of the pipeline/workflow */
  pipelineName?: string;
  /** Description of the pipeline */
  description?: string;
  /** The job runs */
  jobRuns: BFlowJobRun[];
  /** The step runs */
  stepRuns: BFlowStepRun[];
  /** Optional report configuration from workflow YAML */
  reports?: BFlowWorkflowReport[];
  /**
   * Workflow job definitions — used to resolve step output types
   * for format-aware rendering.
   */
  jobs?: BFlowWorkflowJob[];
}

// ─── Constants ──────────────────────────────────────────────────────

const DEFAULT_OPTIONS: BFlowTailwindExportOptions = {
  includeResolvedPrompts: false,
  includeResolvedInputs: true,
  title: "Pipeline Report",
  includeDescription: true,
};

const AMP_ENTITY = "\u0026amp;";
const LT_ENTITY = "\u0026lt;";
const GT_ENTITY = "\u0026gt;";
const QUOT_ENTITY = "\u0026quot;";
const APOS_ENTITY = "\u0026#039;";

// ─── HTML entity helper ─────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, AMP_ENTITY)
    .replace(/</g, LT_ENTITY)
    .replace(/>/g, GT_ENTITY)
    .replace(/"/g, QUOT_ENTITY)
    .replace(/'/g, APOS_ENTITY);
}

/**
 * Convert a string to a safe URL slug (lowercase, hyphens) for anchor ids.
 */
function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section"
  );
}

/**
 * Look up the output type for a step run from the workflow job definitions.
 * Returns undefined if the step or its outputType is not defined.
 */
function resolveStepOutputType(
  stepRun: BFlowStepRun,
  jobs?: BFlowWorkflowJob[],
): BFlowStepOutputType | undefined {
  if (!jobs) return undefined;
  for (const job of jobs) {
    const step = job.steps?.find(
      (s) => s.id === stepRun.stepId || s.name === stepRun.stepName,
    );
    if (step?.outputType) return step.outputType;
  }
  return undefined;
}


// ─── Status badge styling (light theme) ─────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  succeeded: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-rose-50 text-rose-700 border-rose-200",
  running: "bg-bflow-50 text-brand border-bflow-200",
  pending: "bg-slate-100 text-slate-600 border-slate-200",
  skipped: "bg-amber-50 text-amber-700 border-amber-200",
  cancelled: "bg-amber-50 text-amber-700 border-amber-200",
};

/** Renders a compact, colored status badge (no icons — clean pill). */
function statusBadge(status?: string): string {
  const style = STATUS_STYLES[status ?? ""] ?? STATUS_STYLES.skipped;
  const label = status ?? "unknown";
  return [
    `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${style}">`,
    `<span class="w-1.5 h-1.5 rounded-full bg-current"></span>`,
    `${escapeHtml(label)}`,
    `</span>`,
  ].join("");
}

// ─── Report head stylesheet ─────────────────────────────────────────
// Modern LIGHT website shell matching the BunnyFlow (Laravel crimson)
// theme. Utility layout comes from the Tailwind CDN; this block provides
// the soft gradient background, white glass surfaces, typography,
// per-format output styling, animations, scrollbars, and print.

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
          // BunnyFlow brand — Laravel crimson → rose gradient
          brand: '#ff2d20',
          bflow: {
            50: '#fef2f2',
            100: '#ffe4e6',
            200: '#fecdd3',
            300: '#fda4af',
            400: '#fb7185',
            500: '#f43f5e',
            600: '#e11d48',
            700: '#be123c',
          },
        },
      },
    },
  }
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root { color-scheme: light; }
  html { scroll-behavior: smooth; }
  body {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    background-color: #faf7f6;
    background-image:
      radial-gradient(60rem 40rem at 8% -12%, rgba(255,45,32,0.10), transparent 60%),
      radial-gradient(50rem 36rem at 110% 4%, rgba(244,63,94,0.10), transparent 60%),
      radial-gradient(42rem 32rem at 50% 118%, rgba(244,63,94,0.06), transparent 60%);
    background-attachment: fixed;
    color: #0f172a;
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }
  .font-display { font-family: 'Space Grotesk', 'Inter', sans-serif; }
  .font-mono, pre, code { font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace; }

  /* White glass surfaces */
  .glass {
    background: #ffffff;
    border: 1px solid rgba(15,23,42,0.08);
    box-shadow: 0 8px 32px rgba(15,23,42,0.06);
  }

  /* Fade-in on load */
  @keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
  .rise { animation: rise 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }
  .rise-1 { animation-delay: 0.05s; } .rise-2 { animation-delay: 0.12s; }
  .rise-3 { animation-delay: 0.2s; }

  /* Anchor hotlinks + back-to-index */
  .anchor-target { scroll-margin-top: 1.5rem; }
  .hash-symbol { opacity: 0; transition: opacity 0.15s ease; color: #94a3b8; font-weight: 500; }
  .group:hover .hash-symbol,
  .hash-link:hover .hash-symbol,
  .hash-link:focus-visible .hash-symbol { opacity: 1; color: #ff2d20; }
  .hash-link { text-decoration: none; }
  .back-to-index { text-decoration: none; }
  .back-to-index:hover { color: #ff2d20; }

  /* ── Output panels ─────────────────────────────── */
  .output-panel { border-radius: 0.75rem; overflow: hidden; }
  .output-panel pre { margin: 0; border-radius: 0.75rem; }
  .rm-pad { padding: 1rem; }

  /* Markdown prose (light) — parsed with marked (GFM) */
  .rm-markdown { line-height: 1.75; }
  .rm-markdown h1, .rm-markdown h2, .rm-markdown h3, .rm-markdown h4 {
    color: #0f172a; font-weight: 600; margin: 1.25em 0 0.5em;
    font-family: 'Space Grotesk', 'Inter', sans-serif;
  }
  .rm-markdown h1 { font-size: 1.45rem; }
  .rm-markdown h2 { font-size: 1.25rem; }
  .rm-markdown h3 { font-size: 1.1rem; }
  .rm-markdown p, .rm-markdown li { color: #334155; }
  .rm-markdown p { margin: 0.6em 0; }
  .rm-markdown ul, .rm-markdown ol { padding-left: 1.5rem; margin: 0.6em 0; }
  .rm-markdown li { margin: 0.25em 0; }
  .rm-markdown strong { color: #0f172a; }
  .rm-markdown a { color: #ff2d20; text-decoration: none; }
  .rm-markdown a:hover { text-decoration: underline; }
  .rm-markdown blockquote {
    border-left: 3px solid #fecdd3; padding-left: 1rem;
    color: #64748b; margin: 0.75em 0;
  }
  .rm-markdown hr { border: 0; border-top: 1px solid #e2e8f0; margin: 1.5em 0; }
  .rm-markdown code {
    background: #ffe4e6; color: #be123c;
    padding: 0.15em 0.4em; border-radius: 0.375rem; font-size: 0.85em;
  }
  .rm-markdown pre {
    background: #0f172a; border: 1px solid rgba(15,23,42,0.1);
    padding: 1rem; border-radius: 0.75rem; overflow-x: auto; margin: 0.75em 0;
  }
  .rm-markdown pre code { background: transparent; padding: 0; color: #e2e8f0; }
  .rm-markdown table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 0.9rem; }
  .rm-markdown th, .rm-markdown td { border: 1px solid #e2e8f0; padding: 0.5rem 0.75rem; text-align: left; }
  .rm-markdown th { background: #f1f5f9; font-weight: 600; }
  .rm-markdown img { max-width: 100%; height: auto; border-radius: 8px; }

  /* Code panels → dark so the text matches the code-block background */
  .output-panel pre { background: #0f172a !important; }
  .output-panel pre code { color: #e2e8f0; }
  .output-panel .rm-plain { color: #e2e8f0; border: 1px solid rgba(15,23,42,0.1); }

  /* Raw HTML output — sandboxed iframe with an "open in new tab" action */
  .html-frame {
    border-radius: 0.75rem; overflow: hidden;
    border: 1px solid rgba(15,23,42,0.08); background: #ffffff;
  }
  .html-frame-toolbar {
    display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
    padding: 0.5rem 0.75rem; background: #f1f5f9; border-bottom: 1px solid #e2e8f0;
  }
  .html-frame-label {
    font-size: 0.7rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.05em; color: #64748b;
  }
  .html-frame-toolbar button {
    display: inline-flex; align-items: center; gap: 0.35rem;
    font-size: 0.7rem; font-weight: 600; color: #ff2d20; background: #ffffff;
    border: 1px solid #fecdd3; border-radius: 0.5rem; padding: 0.3rem 0.6rem; cursor: pointer;
  }
  .html-frame-toolbar button:hover { background: #fff1f2; }
  .html-frame-iframe { width: 100%; height: 420px; border: 0; background: #ffffff; display: block; }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-thumb { background: rgba(15,23,42,0.18); border-radius: 9999px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(15,23,42,0.30); }
  ::-webkit-scrollbar-track { background: transparent; }

  @media print {
    body { background: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    .page-break { break-before: page; }
  }
</style>
<script>
  function bflowOpenHtml(frame) {
    var src = frame.getAttribute('srcdoc');
    var blob = new Blob([src], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
  }
</script>`.trim();

// ─── Lazy adapter registration guard ─────────────────────────────────

let _adaptersRegistered = false;

// ═══════════════════════════════════════════════════════════════════════
// BFlowTailwindExportService
// ═══════════════════════════════════════════════════════════════════════

export class BFlowTailwindExportService {
  /**
   * Ensure built-in render adapters are registered with the RenderEngine.
   * Called lazily on first render to avoid side effects at import time.
   */
  private static ensureAdaptersRegistered(): void {
    if (!_adaptersRegistered) {
      registerBuiltinAdapters();
      _adaptersRegistered = true;
    }
  }

  /**
   * Map BFlowStepOutputType to RenderFormat for the RenderEngine.
   */
  private static readonly STEP_FORMAT_MAP: Record<string, RenderFormat> = {
    plain: "plain",
    markdown: "markdown",
    json: "json",
    html: "html",
    csv: "csv",
    json_array: "json",
    yaml: "yaml",
    tailwind: "tailwind",
  };

  /**
   * Generate a standalone, beautifully-styled HTML report for a pipeline run.
   */
  generate(
    input: BFlowTailwindExportInput,
    options?: BFlowTailwindExportOptions,
  ): string {
    const opts = { ...DEFAULT_OPTIONS, ...options, jobs: input.jobs };
    const title = opts.title ?? input.pipelineName ?? "Pipeline Report";

    const generatedAt = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const jobsHtml = input.jobRuns.length
      ? input.jobRuns
          .map((jobRun, jobIdx) => this.renderJob(jobRun, jobIdx, input, opts))
          .join("\n")
      : [
          `<div class="glass rounded-3xl p-14 text-center">`,
          `  <p class="text-slate-400">No job runs available for this report.</p>`,
          `</div>`,
        ].join("\n");

    return [
      `<!DOCTYPE html>`,
      `<html lang="en">`,
      `<head>`,
      `  <meta charset="UTF-8" />`,
      `  <meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
      `  <title>${escapeHtml(title)}</title>`,
      REPORT_HEAD,
      `</head>`,
      `<body class="antialiased">`,
      this.renderPage(input, opts, title, generatedAt, jobsHtml),
      `</body>`,
      `</html>`,
    ].join("\n");
  }

  /**
   * Assemble the full page: hero header, summary stats, jobs, and footer.
   */
  private renderPage(
    input: BFlowTailwindExportInput,
    opts: BFlowTailwindExportOptions,
    title: string,
    generatedAt: string,
    jobsHtml: string,
  ): string {
    const summary = this.renderSummary(input);

    return [
      `<div id="top" class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 md:pt-16">`,
      `  <header class="relative rise rise-1 mb-12">`,
      `    <button onclick="window.print()" class="no-print absolute top-0 right-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#ff2d20] to-[#f43f5e] hover:opacity-90 shadow-lg shadow-red-500/25 transition-opacity">`,
      `      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>`,
      `      Print / Save PDF`,
      `    </button>`,
      `    <div class="text-center">`,
      `      <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff2d20] bg-red-50 border border-red-200 mb-6">`,
      `        <span class="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#ff2d20] to-[#f43f5e] animate-pulse"></span>`,
      `        BunnyFlow Pipeline Report`,
      `      </div>`,
      `      <h1 class="font-display text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-[#ff2d20] to-[#f43f5e] bg-clip-text text-transparent">`,
      `        ${escapeHtml(title)}`,
      `      </h1>`,
      input.description && opts.includeDescription
        ? `      <p class="mt-5 text-slate-600 text-lg max-w-2xl mx-auto leading-relaxed">${escapeHtml(input.description)}</p>`
        : "",
      `      <div class="mt-7 flex flex-wrap justify-center gap-2.5">`,
      `        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 glass rounded-full text-xs text-slate-600">`,
      `          <svg class="w-3.5 h-3.5 text-[#ff2d20]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
      `          ${escapeHtml(generatedAt)}`,
      `        </span>`,
      `        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 glass rounded-full text-xs text-slate-600">`,
      `          <svg class="w-3.5 h-3.5 text-[#f43f5e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
      `          ${input.jobRuns.length} Job${input.jobRuns.length !== 1 ? "s" : ""}`,
      `        </span>`,
      `        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 glass rounded-full text-xs text-slate-600">`,
      `          <svg class="w-3.5 h-3.5 text-[#fb7185]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 6h6M9 12h6M9 18h6"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`,
      `          ${input.stepRuns.length} Step${input.stepRuns.length !== 1 ? "s" : ""}`,
      `        </span>`,
      `        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 glass rounded-full text-xs text-slate-600">`,
      `          <svg class="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
      `          ${escapeHtml(this.overallStatus(input))}`,
      `        </span>`,
      `      </div>`,
      `    </div>`,
      `  </header>`,
      ``,
      `  ${summary}`,
      ``,
      `  ${this.renderIndex(input)}`,
      ``,
      `  <main class="space-y-6 relative rise rise-3">`,
      `    ${jobsHtml}`,
      `  </main>`,
      ``,
      this.renderFooter(),
      `</div>`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  /**
   * Render a summary strip of key metrics.
   */
  private renderSummary(input: BFlowTailwindExportInput): string {
    const succeededJobs = input.jobRuns.filter((jr) => jr.status === "succeeded").length;
    const failedJobs = input.jobRuns.filter((jr) => jr.status === "failed").length;
    const succeededSteps = input.stepRuns.filter((sr) => sr.status === "succeeded").length;

    const stat = (
      icon: string,
      accent: string,
      value: string,
      label: string,
    ): string => [
      `<div class="glass rounded-2xl p-5">`,
      `  <div class="flex items-center gap-3.5">`,
      `    <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${accent}">`,
      `      ${icon}`,
      `    </div>`,
      `    <div>`,
      `      <div class="font-display text-2xl font-bold text-slate-900">${value}</div>`,
      `      <div class="text-xs text-slate-500 mt-0.5">${label}</div>`,
      `    </div>`,
      `  </div>`,
      `</div>`,
    ].join("\n");

    const icons = {
      jobs:
        `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M4 6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z"/><path d="M14 6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V6z"/><path d="M4 16a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2z"/><path d="M14 16a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2z"/></svg>`,
      ok:
        `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>`,
      fail:
        `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M6 18L18 6"/><circle cx="12" cy="12" r="9"/></svg>`,
      steps:
        `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2z"/><path d="M19 19v-11a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v11"/><path d="M3 3h18"/></svg>`,
    };

    return [
      `<section class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12 rise rise-2">`,
      `  ${stat(icons.jobs, "bg-red-50 text-[#ff2d20] border border-red-200", String(input.jobRuns.length), "Total Jobs")}`,
      `  ${stat(icons.ok, "bg-emerald-50 text-emerald-600 border border-emerald-200", String(succeededJobs), "Jobs Succeeded")}`,
      `  ${stat(icons.fail, "bg-rose-50 text-rose-600 border border-rose-200", String(failedJobs), "Jobs Failed")}`,
      `  ${stat(icons.steps, "bg-rose-50 text-rose-600 border border-rose-200", `${succeededSteps}/${input.stepRuns.length}`, "Steps Passed")}`,
      `</section>`,
    ].join("\n");
  }

  /**
   * Build a unique anchor id for a job section.
   */
  private jobAnchor(jobRun: BFlowJobRun): string {
    return `job-${slugify(jobRun.jobName)}`;
  }

  /**
   * Build a unique anchor id for a step section.
   */
  private stepAnchor(
    jobIdx: number,
    stepIdx: number,
    stepRun: BFlowStepRun,
  ): string {
    return `step-${jobIdx + 1}-${stepIdx + 1}-${slugify(stepRun.stepName)}`;
  }

  /**
   * Render the index / table of contents with anchor hotlinks to each
   * job and step section.
   */
  private renderIndex(input: BFlowTailwindExportInput): string {
    if (input.jobRuns.length === 0) return "";

    const jobs = input.jobRuns
      .map((jobRun, jobIdx) => {
        const jobAnchor = this.jobAnchor(jobRun);
        const stepRuns = input.stepRuns.filter(
          (sr) => sr.jobRunId === jobRun.id,
        );
        const steps = stepRuns.length
          ? [
              `<ol class="mt-1.5 ml-5 space-y-1 border-l border-slate-200 pl-4">`,
              ...stepRuns.map((stepRun, stepIdx) => {
                const anchor = this.stepAnchor(jobIdx, stepIdx, stepRun);
                return `<li><a href="#${anchor}" class="text-xs text-slate-600 hover:text-[#ff2d20] transition-colors">${stepIdx + 1}. ${escapeHtml(stepRun.stepName)}</a></li>`;
              }),
              `</ol>`,
            ].join("\n")
          : "";

        return [
          `<li>`,
          `  <a href="#${jobAnchor}" class="inline-flex items-center gap-2 text-sm font-medium text-[#ff2d20] hover:text-[#e0241b] transition-colors">`,
          `    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
          `    ${escapeHtml(jobRun.jobName)}`,
          `  </a>`,
          `  ${steps}`,
          `</li>`,
        ].join("\n");
      })
      .join("\n");

    return [
      `<section id="toc" class="glass rounded-3xl p-6 mb-10 rise rise-2">`,
      `  <div class="flex items-center gap-2 mb-4">`,
      `    <svg class="w-4 h-4 text-[#ff2d20]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
      `    <h2 class="font-display text-lg font-semibold text-slate-900">Index</h2>`,
      `  </div>`,
      `  <ol class="space-y-3">${jobs}</ol>`,
      `</section>`,
    ].join("\n");
  }

  /**
   * Render a single job run as a large white card containing its steps.
   */
  private renderJob(
    jobRun: BFlowJobRun,
    jobIdx: number,
    input: BFlowTailwindExportInput,
    opts: BFlowTailwindExportOptions,
  ): string {
    const stepRuns = input.stepRuns.filter((sr) => sr.jobRunId === jobRun.id);

    const metaChips = [
      statusBadge(jobRun.status),
      jobRun.agent
        ? `<span class="inline-flex items-center gap-1 text-[11px] text-slate-500">${escapeHtml(jobRun.agent)}</span>`
        : "",
      jobRun.aiProvider && jobRun.aiModel
        ? `<span class="inline-flex items-center gap-1 text-[11px] text-slate-500">${escapeHtml(jobRun.aiProvider)} / ${escapeHtml(jobRun.aiModel)}</span>`
        : "",
    ]
      .filter(Boolean)
      .join(" ");

    const error = jobRun.error
      ? [
          `<div class="mx-6 mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5">`,
          `  <svg class="w-4 h-4 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 8v4m0 4h.01"/><circle cx="12" cy="12" r="9"/></svg>`,
          `  <p class="text-sm text-rose-700">${escapeHtml(jobRun.error)}</p>`,
          `</div>`,
        ].join("\n")
      : "";

    const steps = stepRuns.length
      ? stepRuns
          .map((stepRun, stepIdx) => this.renderStep(stepRun, stepIdx, jobIdx, opts))
          .join("\n")
      : `<p class="text-sm text-slate-400 text-center py-6">No step runs available.</p>`;

    const jobAnchor = this.jobAnchor(jobRun);
    return [
      `<article id="${jobAnchor}" class="glass rounded-3xl overflow-hidden anchor-target">`,
      `  <div class="flex items-center justify-between gap-4 px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-transparent">`,
      `    <div class="flex items-center gap-4 min-w-0">`,
      `      <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#ff2d20] to-[#f43f5e] flex items-center justify-center shadow-lg shadow-red-500/25 shrink-0">`,
      `        <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
      `      </div>`,
      `      <div class="min-w-0">`,
      `        <h2 class="font-display text-xl font-semibold text-slate-900 truncate group flex items-center gap-1.5">`,
      `          <span class="truncate">${escapeHtml(jobRun.jobName)}</span>`,
      `          <a href="#${jobAnchor}" class="hash-link shrink-0" aria-label="Link to ${escapeHtml(jobRun.jobName)}"><span class="hash-symbol">#</span></a>`,
      `        </h2>`,
      `        <div class="flex flex-wrap items-center gap-2 mt-1.5">${metaChips}</div>`,
      `      </div>`,
      `    </div>`,
      `    <div class="text-right shrink-0">`,
      `      <div class="font-display text-2xl font-bold text-slate-900">${stepRuns.length}</div>`,
      `      <div class="text-[11px] text-slate-500 uppercase tracking-wider">Steps</div>`,
      `    </div>`,
      `  </div>`,
      `  ${error}`,
      `  <div class="px-6 py-5 space-y-4">`,
      `    ${steps}`,
      `  </div>`,
      `</article>`,
    ].join("\n");
  }

  /**
   * Render a single step run as a nested card.
   */
  private renderStep(
    stepRun: BFlowStepRun,
    stepIdx: number,
    jobIdx: number,
    opts: BFlowTailwindExportOptions,
  ): string {
    const outputType = resolveStepOutputType(stepRun, opts.jobs);

    const metaChips = [
      statusBadge(stepRun.status),
      stepRun.agent
        ? `<span class="inline-flex items-center gap-1 text-[11px] text-slate-500">Agent: ${escapeHtml(stepRun.agent)}</span>`
        : "",
    ]
      .filter(Boolean)
      .join(" ");

    const aiChip =
      stepRun.aiProvider && stepRun.aiModel
        ? `<span class="text-[11px] text-slate-500">${escapeHtml(stepRun.aiProvider)} / ${escapeHtml(stepRun.aiModel)}</span>`
        : "";

    const error = stepRun.error
      ? [
          `<div class="p-3 rounded-lg bg-rose-50 border border-rose-200">`,
          `  <p class="text-xs text-rose-700">${escapeHtml(stepRun.error)}</p>`,
          `</div>`,
        ].join("\n")
      : "";

    const systemPrompt =
      opts.includeResolvedPrompts && stepRun.resolvedSystemPrompt
        ? this.renderPromptBox("System Prompt", stepRun.resolvedSystemPrompt)
        : "";

    const userPrompt =
      opts.includeResolvedPrompts && stepRun.resolvedUserPrompt
        ? this.renderPromptBox("User Prompt", stepRun.resolvedUserPrompt)
        : "";

    const output = stepRun.output
      ? [
          `<div>`,
          `  <div class="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">`,
          `    <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>`,
          `    Output`,
          `  </div>`,
          `  ${this.renderOutputContent(stepRun.output, outputType)}`,
          `</div>`,
        ].join("\n")
      : "";

    const structured =
      stepRun.structuredOutput && Object.keys(stepRun.structuredOutput).length > 0
        ? [
            `<div>`,
            `  <div class="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">`,
            `    <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`,
            `    Structured Outputs`,
            `  </div>`,
            `  <div class="output-panel"><pre class="text-xs text-slate-200 whitespace-pre-wrap break-words font-mono p-4 bg-[#0f172a] border border-slate-800 rounded-xl overflow-x-auto"><code>${escapeHtml(JSON.stringify(stepRun.structuredOutput, null, 2))}</code></pre></div>`,
            `</div>`,
          ].join("\n")
        : "";

    const inputs =
      opts.includeResolvedInputs !== false &&
      stepRun.resolvedInputs &&
      Object.keys(stepRun.resolvedInputs).length > 0
        ? [
            `<div>`,
            `  <div class="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">`,
            `    <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>`,
            `    Resolved Inputs`,
            `  </div>`,
            `  <div class="flex flex-wrap gap-1.5">`,
            ...Object.entries(stepRun.resolvedInputs).map(([key, value]) =>
              [
                `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs">`,
                `  <span class="font-medium text-slate-600">${escapeHtml(key)}:</span>`,
                `  <span class="text-slate-500 font-mono">${escapeHtml(String(value ?? ""))}</span>`,
                `</span>`,
              ].join(""),
            ),
            `  </div>`,
            `</div>`,
          ].join("\n")
        : "";

    const stepAnchor = this.stepAnchor(jobIdx, stepIdx, stepRun);
    return [
      `<div id="${stepAnchor}" class="rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors overflow-hidden anchor-target">`,
      `  <div class="px-5 py-4 flex items-center justify-between gap-3 border-b border-slate-200">`,
      `    <div class="flex items-center gap-3 min-w-0">`,
      `      <span class="w-8 h-8 rounded-full bg-white border border-slate-300 text-xs font-bold text-slate-600 flex items-center justify-center shrink-0 font-mono">${stepIdx + 1}</span>`,
      `      <div class="min-w-0">`,
      `        <h3 class="text-sm font-semibold text-slate-900 truncate group flex items-center gap-1.5">`,
      `          <span class="truncate">${escapeHtml(stepRun.stepName)}</span>`,
      `          <a href="#${stepAnchor}" class="hash-link shrink-0" aria-label="Link to ${escapeHtml(stepRun.stepName)}"><span class="hash-symbol">#</span></a>`,
      `          <a href="#toc" class="back-to-index inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-slate-400 hover:text-[#ff2d20] shrink-0">`,
      `            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>`,
      `            Back to index`,
      `          </a>`,
      `        </h3>`,
      `        <div class="flex flex-wrap items-center gap-2 mt-1">${metaChips}</div>`,
      `      </div>`,
      `    </div>`,
      `    ${aiChip ? `<div class="shrink-0">${aiChip}</div>` : ""}`,
      `  </div>`,
      `  <div class="px-5 py-4 space-y-3">`,
      `    ${error}`,
      `    ${systemPrompt}`,
      `    ${userPrompt}`,
      `    ${output}`,
      `    ${structured}`,
      `    ${inputs}`,
      `  </div>`,
      `</div>`,
    ].join("\n");
  }

  /**
   * Render a labeled prompt block with preserved whitespace.
   */
  private renderPromptBox(label: string, content: string): string {
    return [
      `<div>`,
      `  <div class="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">`,
      `    <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
      `    ${escapeHtml(label)}`,
      `  </div>`,
      `  <pre class="text-xs text-slate-200 whitespace-pre-wrap break-words font-mono p-4 bg-[#0f172a] border border-slate-800 rounded-xl overflow-x-auto"><code>${escapeHtml(content)}</code></pre>`,
      `</div>`,
    ].join("\n");
  }

  /**
   * Render step output content.
   *
   * - Markdown is parsed with **marked** (GFM): `#` inside fenced code blocks
   *   stays literal (never a heading) and markdown tables render correctly.
   * - Every other format is rendered through the RenderEngine (the same engine
   *   powering the UI's RenderView) with light syntax palettes.
   * - `html` output embeds the actual HTML; complete documents are reduced to
   *   their <body> content while preserving their <head> styles.
   */
  private renderOutputContent(
    output: string,
    outputType: BFlowStepOutputType | undefined,
  ): string {
    BFlowTailwindExportService.ensureAdaptersRegistered();
    const format = outputType
      ? (BFlowTailwindExportService.STEP_FORMAT_MAP[outputType] ?? "markdown")
      : "markdown";

    // Markdown: use the real GFM parser (marked). The render module's regex
    // markdown adapter re-interprets `#` inside code blocks as headings and
    // drops tables — marked handles both correctly.
    if (format === "markdown") {
      return this.renderMarkdownPanel(output);
    }

    // Raw HTML output (html / tailwind): render inside a sandboxed iframe with
    // an "open in new tab" action. The raw HTML is used verbatim (never reduced
    // to a fragment) so complete documents keep their full styling. Tailwind
    // output is passed through the tailwind adapter so its CDN loads inside the
    // iframe and its utility classes resolve.
    if (format === "html" || format === "tailwind") {
      let doc = output;
      if (format === "tailwind") {
        try {
          doc = RenderEngine.renderHtml("tailwind", output).html.html;
        } catch {
          /* keep the raw output */
        }
      }
      return this.renderHtmlFrame(
        doc,
        format === "tailwind" ? "Tailwind Preview" : "HTML Output",
      );
    }

    // Code-like formats (json / csv / yaml / plain): render through the
    // RenderEngine with dark syntax palettes so the text matches the dark
    // code-block background.
    try {
      const fragment = RenderEngine.renderHtml(format, output, {
        darkMode: true,
      }).html.html;
      return `<div class="output-panel">${fragment}</div>`;
    } catch {
      return this.renderMarkdownPanel(output);
    }
  }

  /**
   * Render raw HTML inside a sandboxed iframe (srcdoc) with an "open in new
   * tab" action in the toolbar above it.
   */
  private renderHtmlFrame(doc: string, label: string): string {
    return [
      `<div class="html-frame">`,
      `  <div class="html-frame-toolbar no-print">`,
      `    <span class="html-frame-label">${escapeHtml(label)}</span>`,
      `    <button type="button" onclick="bflowOpenHtml(this.parentElement.nextElementSibling)">`,
      `      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
      `      Open in new tab`,
      `    </button>`,
      `  </div>`,
      `  <iframe class="html-frame-iframe" sandbox="allow-scripts" srcdoc="${escapeHtml(doc)}" title="${escapeHtml(label)}"></iframe>`,
      `</div>`,
    ].join("\n");
  }

  /**
   * Render content through marked (GFM) inside a styled markdown panel.
   */
  private renderMarkdownPanel(output: string): string {
    const body = marked.parse(output) as string;
    return `<div class="output-panel rm-pad"><div class="rm-markdown">${body}</div></div>`;
  }

  /**
   * Compute a human-friendly overall status from the job runs.
   */
  private overallStatus(input: BFlowTailwindExportInput): string {
    if (input.jobRuns.length === 0) return "No runs";
    if (input.jobRuns.some((jr) => jr.status === "failed")) return "Failed";
    if (input.jobRuns.every((jr) => jr.status === "succeeded")) return "Succeeded";
    if (input.jobRuns.some((jr) => jr.status === "running")) return "Running";
    return "In Progress";
  }

  /**
   * Render the page footer.
   */
  private renderFooter(): string {
    return [
      `<footer class="mt-16 pb-10 pt-10 border-t border-slate-200 text-center">`,
      `  <div class="inline-flex items-center gap-2 text-xs text-slate-400">`,
      `    <svg class="w-3.5 h-3.5 text-[#ff2d20]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4"/><circle cx="12" cy="12" r="3.5"/></svg>`,
      `    Generated by BunnyFlow Pipeline Report &middot; ${new Date().toISOString()}`,
      `  </div>`,
      `</footer>`,
    ].join("\n");
  }

  /**
   * Export pipeline run data as a downloadable blob.
   */
  exportToBlob(
    input: BFlowTailwindExportInput,
    options?: BFlowTailwindExportOptions,
  ): Blob {
    const content = this.generate(input, options);
    return new Blob([content], { type: "text/html" });
  }

  /**
   * Create a download URL for the export.
   */
  createDownloadUrl(
    input: BFlowTailwindExportInput,
    filename?: string,
    options?: BFlowTailwindExportOptions,
  ): string {
    const blob = this.exportToBlob(input, options);
    return URL.createObjectURL(blob);
  }

  /**
   * Trigger an immediate download in the browser.
   */
  download(
    input: BFlowTailwindExportInput,
    filename?: string,
    options?: BFlowTailwindExportOptions,
  ): void {
    const url = this.createDownloadUrl(input, filename, options);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename ?? `${input.pipelineName ?? "pipeline-report"}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// ─── Singleton ──────────────────────────────────────────────────────

export const bflowTailwindExportService = new BFlowTailwindExportService();
