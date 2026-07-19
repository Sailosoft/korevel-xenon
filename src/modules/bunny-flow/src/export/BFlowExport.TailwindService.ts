/**
 * BFlowExport.TailwindService — Pipeline run HTML export with Tailwind CSS design.
 *
 * Generates a standalone HTML document styled with Tailwind CSS (via CDN) from
 * pipeline step outputs, grouped by jobs and steps. The output is suitable for
 * viewing in a browser or printing.
 *
 * Unlike the base BFlowExportService which uses basic HTML, this service
 * produces a polished, modern HTML report with proper Tailwind utility classes.
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
  /** Whether to include resolved prompts in the export */
  includePrompts?: boolean;
  /** Whether to include system/user prompts */
  includeResolvedPrompts?: boolean;
  /** Whether to include resolved input values. Defaults to true. */
  includeResolvedInputs?: boolean;
  /** Custom title for the report */
  title?: string;
  /** Whether to include the pipeline description */
  includeDescription?: boolean;
  /** Color theme: "light" | "dark" */
  theme?: "light" | "dark";
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
   * for format-aware rendering (e.g., HTML output is embedded directly).
   */
  jobs?: BFlowWorkflowJob[];
}

// ─── Constants ──────────────────────────────────────────────────────

const DEFAULT_OPTIONS: BFlowTailwindExportOptions = {
  includePrompts: true,
  includeResolvedPrompts: false,
  includeResolvedInputs: true,
  title: "Pipeline Report",
  includeDescription: true,
  theme: "light",
};

// ─── HTML entity helpers ────────────────────────────────────────────

const HTML_AMP = "&";
const HTML_LT = "<";
const HTML_GT = ">";
const AMP_ENTITY = "\u0026amp;";
const LT_ENTITY = "\u0026lt;";
const GT_ENTITY = "\u0026gt;";
const QUOT_ENTITY = "\u0026quot;";
const APOS_ENTITY = "\u0026#039;";
const HTML_APOS = "&#039;";

/**
 * Look up the output type for a step run from the workflow job definitions.
 * Returns "markdown" as the default if the step or its outputType is not defined.
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, AMP_ENTITY)
    .replace(/</g, LT_ENTITY)
    .replace(/>/g, GT_ENTITY)
    .replace(/"/g, QUOT_ENTITY)
    .replace(/'/g, APOS_ENTITY);
}

// ─── Status helper ──────────────────────────────────────────────────

function getStatusBadge(status?: string): string {
  switch (status) {
    case "succeeded":
      return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        Succeeded
      </span>`;
    case "failed":
      return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        Failed
      </span>`;
    case "running":
      return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
        <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
        Running
      </span>`;
    case "pending":
      return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        Pending
      </span>`;
    case "skipped":
      return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-500 border border-slate-200">
        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        Skipped
      </span>`;
    case "cancelled":
      return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
        Cancelled
      </span>`;
    default:
      return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">Unknown</span>`;
  }
}

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
   * Generate a complete HTML document with Tailwind CSS styling.
   */
  generate(
    input: BFlowTailwindExportInput,
    options?: BFlowTailwindExportOptions,
  ): string {
    const opts = { ...DEFAULT_OPTIONS, ...options, jobs: input.jobs };
    const title = opts.title ?? input.pipelineName ?? "Pipeline Report";
    const jobsHtml = this.renderJobs(input, opts);
    const summaryHtml = this.renderSummary(input);
    const variablesHtml = this.renderVariables(input);

    return `<!DOCTYPE html>
<html lang="en" class="${opts.theme === "dark" ? "dark" : ""}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
          },
        },
      },
    }
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    @media print {
      .no-print { display: none !important; }
      body { font-size: 11pt; }
      .page-break { page-break-before: always; }
    }
    body { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
    pre, code { font-family: 'JetBrains Mono', 'Fira Code', monospace; }
    .prose pre { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1rem; overflow-x: auto; }
    .dark .prose pre { background-color: #1e293b; border-color: #334155; }
    .output-content { white-space: pre-wrap; word-break: break-word; }
  </style>
</head>
<body class="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-screen">
  <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- ── Header ──────────────────────────────────────────── -->
    <header class="mb-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            ${escapeHtml(title)}
          </h1>
          ${
            input.description && opts.includeDescription
              ? `<p class="mt-2 text-slate-500 dark:text-slate-400 text-sm">${escapeHtml(input.description)}</p>`
              : ""
          }
        </div>
        <div class="no-print flex items-center gap-2">
          <button onclick="window.print()" class="inline-flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
            Print
          </button>
        </div>
      </div>
      <div class="mt-4 flex flex-wrap gap-2">
        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-400">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
          ${input.jobRuns.length} Job${input.jobRuns.length !== 1 ? "s" : ""}
        </span>
        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-400">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          ${input.stepRuns.length} Step${input.stepRuns.length !== 1 ? "s" : ""}
        </span>
        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-400">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </span>
      </div>
    </header>

    <!-- ── Summary Section ─────────────────────────────────── -->
    ${summaryHtml}

    <!-- ── Jobs & Steps ────────────────────────────────────── -->
    ${jobsHtml}
  </div>

  <footer class="border-t border-slate-200 dark:border-slate-700 mt-12 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
    <p>Generated by BunnyFlow Pipeline Report &mdash; ${new Date().toISOString()}</p>
  </footer>
</body>
</html>`;
  }

  /**
   * Render summary statistics.
   */
  private renderSummary(input: BFlowTailwindExportInput): string {
    const totalJobs = input.jobRuns.length;
    const succeededJobs = input.jobRuns.filter(
      (jr) => jr.status === "succeeded",
    ).length;
    const failedJobs = input.jobRuns.filter(
      (jr) => jr.status === "failed",
    ).length;
    const totalSteps = input.stepRuns.length;
    const succeededSteps = input.stepRuns.filter(
      (sr) => sr.status === "succeeded",
    ).length;

    return `
    <section class="mb-8">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            </div>
            <div>
              <p class="text-2xl font-bold text-slate-900 dark:text-white">${totalJobs}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400">Total Jobs</p>
            </div>
          </div>
        </div>
        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
              <svg class="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <p class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">${succeededJobs}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400">Jobs Succeeded</p>
            </div>
          </div>
        </div>
        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
              <svg class="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <p class="text-2xl font-bold text-red-600 dark:text-red-400">${failedJobs}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400">Jobs Failed</p>
            </div>
          </div>
        </div>
        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center">
              <svg class="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            </div>
            <div>
              <p class="text-2xl font-bold text-slate-900 dark:text-white">${succeededSteps}/${totalSteps}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400">Steps Passed</p>
            </div>
          </div>
        </div>
      </div>
    </section>`;
  }

  /**
   * Render all jobs and their steps.
   */
  private renderJobs(
    input: BFlowTailwindExportInput,
    opts: BFlowTailwindExportOptions,
  ): string {
    if (input.jobRuns.length === 0) {
      return `
      <div class="text-center py-16">
        <svg class="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
        <p class="text-slate-400 dark:text-slate-500 text-sm">No job runs available for this report.</p>
      </div>`;
    }

    return input.jobRuns
      .map((jobRun, jobIdx) => {
        const jobStepRuns = input.stepRuns.filter(
          (sr) => sr.jobRunId === jobRun.id,
        );

        return `
    <div class="mb-8${jobIdx > 0 ? " page-break" : ""}">
      <!-- Job Header -->
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
        <div class="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <svg class="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
            </div>
            <div>
              <h2 class="text-lg font-semibold text-slate-900 dark:text-white">
                ${escapeHtml(jobRun.jobName)}
              </h2>
              <div class="flex items-center gap-2 mt-0.5">
                ${getStatusBadge(jobRun.status)}
                ${
                  jobRun.agent
                    ? `<span class="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                      ${escapeHtml(jobRun.agent)}
                    </span>`
                    : ""
                }
                ${
                  jobRun.aiProvider && jobRun.aiModel
                    ? `<span class="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                      ${escapeHtml(jobRun.aiProvider)} / ${escapeHtml(jobRun.aiModel)}
                    </span>`
                    : ""
                }
              </div>
            </div>
          </div>
          <div class="text-right">
            <p class="text-2xl font-bold text-slate-900 dark:text-white">${jobStepRuns.length}</p>
            <p class="text-xs text-slate-400 dark:text-slate-500">Step${jobStepRuns.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        <!-- Error Banner -->
        ${
          jobRun.error
            ? `<div class="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2">
              <svg class="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <p class="text-sm text-red-600 dark:text-red-400">${escapeHtml(jobRun.error)}</p>
            </div>`
            : ""
        }

        <!-- Steps -->
        <div class="px-6 py-4 space-y-4">
          ${
            jobStepRuns.length === 0
              ? `<p class="text-sm text-slate-400 dark:text-slate-500 text-center py-6">No step runs available.</p>`
              : jobStepRuns
                  .map((stepRun, stepIdx) =>
                    this.renderStep(stepRun, stepIdx + 1, opts),
                  )
                  .join("")
          }
        </div>
      </div>
    </div>`;
      })
      .join("");
  }

  /**
   * Render a single step run.
   */
  private renderStep(
    stepRun: BFlowStepRun,
    index: number,
    opts: BFlowTailwindExportOptions,
  ): string {
    const outputType = resolveStepOutputType(stepRun, opts.jobs);
    return `
          <div class="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden">
            <!-- Step Header -->
            <div class="px-4 py-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-700">
              <div class="flex items-center gap-2">
                <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  ${index}
                </span>
                <div>
                  <h3 class="text-sm font-medium text-slate-900 dark:text-white">
                    ${escapeHtml(stepRun.stepName)}
                  </h3>
                  <div class="flex items-center gap-2 mt-0.5">
                    ${getStatusBadge(stepRun.status)}
                    ${
                      stepRun.agent
                        ? `<span class="text-xs text-slate-400 dark:text-slate-500">Agent: ${escapeHtml(stepRun.agent)}</span>`
                        : ""
                    }
                  </div>
                </div>
              </div>
              ${
                stepRun.aiProvider && stepRun.aiModel
                  ? `<span class="text-xs text-slate-400 dark:text-slate-500">${escapeHtml(stepRun.aiProvider)} / ${escapeHtml(stepRun.aiModel)}</span>`
                  : ""
              }
            </div>

            <!-- Step Content -->
            <div class="px-4 py-3 space-y-3">
              ${
                stepRun.error
                  ? `<div class="p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p class="text-xs text-red-600 dark:text-red-400">${escapeHtml(stepRun.error)}</p>
                  </div>`
                  : ""
              }

              ${
                opts.includeResolvedPrompts && stepRun.resolvedSystemPrompt
                  ? `<div>
                    <p class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">System Prompt:</p>
                    <pre class="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 overflow-x-auto"><code>${escapeHtml(stepRun.resolvedSystemPrompt)}</code></pre>
                  </div>`
                  : ""
              }

              ${
                opts.includeResolvedPrompts && stepRun.resolvedUserPrompt
                  ? `<div>
                    <p class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">User Prompt:</p>
                    <pre class="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 overflow-x-auto"><code>${escapeHtml(stepRun.resolvedUserPrompt)}</code></pre>
                  </div>`
                  : ""
              }

              ${
                stepRun.output
                  ? `<div>
                    <p class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Output:</p>
                    <div class="prose prose-sm max-w-none dark:prose-invert bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 output-content text-sm text-slate-700 dark:text-slate-300">
                      ${this.renderOutputContent(stepRun.output, outputType)}
                    </div>
                  </div>`
                  : ""
              }

              ${
                stepRun.structuredOutput &&
                Object.keys(stepRun.structuredOutput).length > 0
                  ? `<div>
                    <p class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Structured Outputs:</p>
                    <pre class="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 overflow-x-auto"><code>${escapeHtml(JSON.stringify(stepRun.structuredOutput, null, 2))}</code></pre>
                  </div>`
                  : ""
              }

              ${
                opts.includeResolvedInputs !== false &&
                stepRun.resolvedInputs &&
                Object.keys(stepRun.resolvedInputs).length > 0
                  ? `<div>
                    <p class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Resolved Inputs:</p>
                    <div class="flex flex-wrap gap-1.5">
                      ${Object.entries(stepRun.resolvedInputs)
                        .map(
                          ([key, value]) =>
                            `<span class="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs">
                              <span class="font-medium text-slate-600 dark:text-slate-400">${escapeHtml(key)}:</span>
                              <span class="text-slate-700 dark:text-slate-300">${escapeHtml(String(value))}</span>
                            </span>`,
                        )
                        .join("")}
                    </div>
                  </div>`
                  : ""
              }
            </div>
          </div>`;
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
  };

  /**
   * Render step output content using the RenderEngine — the same engine
   * that powers the UI's RenderView — ensuring consistent rendering
   * between interactive preview and exported HTML for all output types.
   *
   * Adapts BFlowStepOutputType values (html, csv, json, plain, markdown,
   * json_array, yaml) to the corresponding RenderFormat and delegates to
   * the engine's renderHtml() method. Falls back to marked.parse() if the
   * engine or adapter is unavailable.
   */
  private renderOutputContent(
    output: string,
    outputType: BFlowStepOutputType | undefined,
  ): string {
    BFlowTailwindExportService.ensureAdaptersRegistered();
    const format =
      outputType
        ? (BFlowTailwindExportService.STEP_FORMAT_MAP[outputType] ?? "markdown")
        : "markdown";
    try {
      return RenderEngine.renderHtml(format, output).html.html;
    } catch {
      // Fallback: render through marked's markdown parser
      return marked.parse(output) as string;
    }
  }

  /**
   * Render variables section.
   */
  private renderVariables(input: BFlowTailwindExportInput): string {
    // Collect unique variables across all job runs
    const varSet = new Set<string>();
    for (const jobRun of input.jobRuns) {
      for (const v of jobRun.variablesSnapshot ?? []) {
        varSet.add(JSON.stringify(v));
      }
    }
    const variables = Array.from(varSet).map((s) => JSON.parse(s));

    if (variables.length === 0) return "";

    return `
    <section class="mb-8">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">Variables</h2>
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-100 dark:border-slate-700">
              <th class="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
              <th class="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Value</th>
              <th class="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
            ${variables
              .map(
                (v) => `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50">
              <td class="px-5 py-3 font-medium text-slate-900 dark:text-white">${escapeHtml(v.name)}</td>
              <td class="px-5 py-3 text-slate-600 dark:text-slate-400 font-mono text-xs">${escapeHtml(String(v.value ?? ""))}</td>
              <td class="px-5 py-3"><span class="inline-flex px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs text-slate-600 dark:text-slate-400">${escapeHtml(v.type ?? "text")}</span></td>
            </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>`;
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
    const name = filename ?? `${input.pipelineName ?? "pipeline-report"}.html`;
    const url = URL.createObjectURL(blob);
    return url;
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
