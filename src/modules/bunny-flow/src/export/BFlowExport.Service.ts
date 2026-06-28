/**
 * BFlowExport.Service — Pipeline run export service.
 *
 * Generates markdown, html, or plain text export from pipeline step outputs,
 * grouped by jobs and steps. Supports workflow-level report configurations
 * that define how output sources map to export sections.
 *
 * ## Report Sources
 *
 * - `job.step` — includes the full step metadata and output
 * - `job.step.outputs.__raw__` — includes only the raw output text
 * - `job.steps.outputs.{name}` — includes a specific named output from a step
 *
 * ## Export Modes
 *
 * - `markdown` (default) — hierarchical headings with job > step > output
 * - `html` — HTML document structure
 * - `html-docs` — Renders only step output content through the **marked** parser,
 *   producing a polished HTML document. Ideal for documentation-centric pipelines.
 * - `plain` — plain text without formatting
 */

import { marked } from "marked";
import type { BFlowWorkflowReport } from "../workflow/BFlowWorkflow.Types";
import type { BFlowJobRun, BFlowStepRun } from "../run/BFlowRun.Types";

// ─── Types ──────────────────────────────────────────────────────────

export type BFlowExportFormat = "markdown" | "html" | "html-docs" | "plain";

export interface BFlowExportOptions {
  /** Report format. Defaults to "markdown". */
  format?: BFlowExportFormat;
  /** Optional heading level offset (default: 1 = ## for jobs, #### for steps) */
  headingOffset?: number;
  /** Whether to include resolved prompts in the export */
  includePrompts?: boolean;
}

export interface BFlowExportInput {
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
}

// ─── Constants ──────────────────────────────────────────────────────

const DEFAULT_OPTIONS: BFlowExportOptions = {
  format: "markdown",
  headingOffset: 1,
  includePrompts: false,
};

// ─── Export Service ─────────────────────────────────────────────────

export class BFlowExportService {
  /**
   * Generate an export string from pipeline run data.
   *
   * @param input   The pipeline run data to export
   * @param options Export formatting options
   * @returns       The formatted export string
   */
  generate(input: BFlowExportInput, options?: BFlowExportOptions): string {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    switch (opts.format) {
      case "html":
        return this.generateHtml(input, opts);
      case "html-docs":
        return this.generateHtmlDocs(input, opts);
      case "plain":
        return this.generatePlain(input, opts);
      case "markdown":
      default:
        return this.generateMarkdown(input, opts);
    }
  }

  /**
   * Generate a markdown report grouped by jobs and steps.
   */
  private generateMarkdown(
    input: BFlowExportInput,
    opts: BFlowExportOptions,
  ): string {
    const h = (level: number) => "#".repeat(level);
    const base = opts.headingOffset ?? 1;
    const lines: string[] = [];

    // ── Title ──────────────────────────────────────────────────────
    const title =
      input.reports?.[0]?.label ?? input.pipelineName ?? "Pipeline Report";
    lines.push(`# ${title}`);
    lines.push("");

    if (input.description) {
      lines.push(`${input.description}`);
      lines.push("");
    }

    // ── Process each report configuration ──────────────────────────
    if (input.reports && input.reports.length > 0) {
      for (const report of input.reports) {
        this.renderReportSection(lines, report, input, opts, base);
      }
    } else {
      // ── Default: group by jobs → steps (no report config) ──────
      this.renderDefaultSections(lines, input, opts, base);
    }

    return lines.join("\n");
  }

  /**
   * Render a section based on a single report configuration.
   */
  private renderReportSection(
    lines: string[],
    report: BFlowWorkflowReport,
    input: BFlowExportInput,
    opts: BFlowExportOptions,
    base: number,
  ): void {
    const h = (level: number) => "#".repeat(level);
    const reportLabel = report.label ?? report.name;
    lines.push(`${h(base + 1)} ${reportLabel}`);
    lines.push("");

    const source = report.source;

    // ── Parse the source pattern ──────────────────────────────────
    // Sources: "job.step" | "job.step.outputs.__raw__" | "job.steps.outputs.{name}"
    const stepPattern = /^([^.]+)\.([^.]+)$/; // job.step
    const outputsRawPattern = /^([^.]+)\.([^.]+)\.outputs\.__raw__$/; // job.step.outputs.__raw__
    const outputsNamedPattern = /^([^.]+)\.steps\.outputs\.(.+)$/; // job.steps.outputs.{name}

    const stepMatch = source.match(stepPattern);
    const outputsRawMatch = source.match(outputsRawPattern);
    const outputsNamedMatch = source.match(outputsNamedPattern);

    if (stepMatch) {
      // Source: "job.step" — show full step output for specific job.step
      const [, jobName, stepName] = stepMatch;
      this.renderSpecificStep(lines, input, jobName, stepName, opts, base + 1);
    } else if (outputsRawMatch) {
      // Source: "job.step.outputs.__raw__" — show raw output only
      const [, jobName, stepName] = outputsRawMatch;
      this.renderSpecificStepRaw(
        lines,
        input,
        jobName,
        stepName,
        opts,
        base + 1,
      );
    } else if (outputsNamedMatch) {
      // Source: "job.steps.outputs.{name}" — show specific named output across all steps
      const [, jobName, outputName] = outputsNamedMatch;
      this.renderNamedOutput(lines, input, jobName, outputName, opts, base + 1);
    } else {
      // Fallback: treat as raw output reference
      lines.push(`> _Source: ${source}_`);
      lines.push("");
    }
  }

  /**
   * Render the default view — all jobs and steps grouped hierarchically.
   */
  private renderDefaultSections(
    lines: string[],
    input: BFlowExportInput,
    opts: BFlowExportOptions,
    base: number,
  ): void {
    const h = (level: number) => "#".repeat(level);

    for (const jobRun of input.jobRuns) {
      lines.push(`${h(base + 1)} Job: ${jobRun.jobName}`);
      lines.push("");
      lines.push(`- **Status:** ${jobRun.status}`);
      if (jobRun.agent) lines.push(`- **Agent:** ${jobRun.agent}`);
      if (jobRun.aiProvider)
        lines.push(`- **AI Provider:** ${jobRun.aiProvider}`);
      if (jobRun.aiModel) lines.push(`- **AI Model:** ${jobRun.aiModel}`);
      if (jobRun.error) lines.push(`- **Error:** ${jobRun.error}`);
      lines.push("");

      // Get step runs for this job
      const jobStepRuns = input.stepRuns.filter(
        (sr) => sr.jobRunId === jobRun.id,
      );

      if (jobStepRuns.length === 0) {
        lines.push("_No step runs available._");
        lines.push("");
      }

      for (const stepRun of jobStepRuns) {
        lines.push(`${h(base + 2)} Step: ${stepRun.stepName}`);
        lines.push("");

        if (stepRun.status) {
          lines.push(`**Status:** ${stepRun.status}`);
          lines.push("");
        }

        // Include prompts if requested
        if (opts.includePrompts) {
          if (stepRun.resolvedSystemPrompt) {
            lines.push("**System Prompt:**");
            lines.push("```");
            lines.push(stepRun.resolvedSystemPrompt);
            lines.push("```");
            lines.push("");
          }
          if (stepRun.resolvedUserPrompt) {
            lines.push("**User Prompt:**");
            lines.push("```");
            lines.push(stepRun.resolvedUserPrompt);
            lines.push("```");
            lines.push("");
          }
        }

        // Output
        if (stepRun.output) {
          lines.push("**Output:**");
          lines.push("");
          lines.push(stepRun.output);
          lines.push("");
        } else if (stepRun.error) {
          lines.push(`**Error:** ${stepRun.error}`);
          lines.push("");
        }

        // Structured outputs
        if (
          stepRun.structuredOutput &&
          Object.keys(stepRun.structuredOutput).length > 0
        ) {
          lines.push("**Structured Outputs:**");
          lines.push("");
          lines.push("```json");
          lines.push(JSON.stringify(stepRun.structuredOutput, null, 2));
          lines.push("```");
          lines.push("");
        }

        // Resolved inputs
        if (
          stepRun.resolvedInputs &&
          Object.keys(stepRun.resolvedInputs).length > 0
        ) {
          lines.push("**Resolved Inputs:**");
          for (const [key, value] of Object.entries(stepRun.resolvedInputs)) {
            lines.push(`- \`${key}\`: ${String(value)}`);
          }
          lines.push("");
        }
      }
    }
  }

  /**
   * Render output for a specific step (full details).
   */
  private renderSpecificStep(
    lines: string[],
    input: BFlowExportInput,
    jobName: string,
    stepName: string,
    opts: BFlowExportOptions,
    level: number,
  ): void {
    const h = (levelNum: number) => "#".repeat(levelNum);
    const stepRun = this.findStepRun(input, jobName, stepName);

    if (!stepRun) {
      lines.push(`${h(level)} ${jobName}.${stepName}`);
      lines.push("");
      lines.push(
        `_Step "${stepName}" in job "${jobName}" not found or not executed._`,
      );
      lines.push("");
      return;
    }

    lines.push(`${h(level)} ${jobName}.${stepName}`);
    lines.push("");
    lines.push(`**Status:** ${stepRun.status}`);
    if (stepRun.error) {
      lines.push(`**Error:** ${stepRun.error}`);
    }
    lines.push("");

    if (stepRun.output) {
      lines.push(stepRun.output);
      lines.push("");
    }
  }

  /**
   * Render raw output for a specific step (output only, no metadata).
   */
  private renderSpecificStepRaw(
    lines: string[],
    input: BFlowExportInput,
    jobName: string,
    stepName: string,
    opts: BFlowExportOptions,
    level: number,
  ): void {
    const h = (levelNum: number) => "#".repeat(levelNum);
    const stepRun = this.findStepRun(input, jobName, stepName);

    if (!stepRun) {
      lines.push(`${h(level)} ${jobName}.${stepName}`);
      lines.push("");
      lines.push(
        `_Step "${stepName}" in job "${jobName}" not found or not executed._`,
      );
      lines.push("");
      return;
    }

    if (stepRun.output) {
      lines.push(`${h(level)} ${jobName}.${stepName}`);
      lines.push("");
      lines.push(stepRun.output);
      lines.push("");
    }
  }

  /**
   * Render a specific named output across all steps in a job.
   */
  private renderNamedOutput(
    lines: string[],
    input: BFlowExportInput,
    jobName: string,
    outputName: string,
    opts: BFlowExportOptions,
    level: number,
  ): void {
    const h = (levelNum: number) => "#".repeat(levelNum);
    const jobRun = input.jobRuns.find((jr) => jr.jobName === jobName);

    if (!jobRun) {
      lines.push(`${h(level)} ${jobName} (output: ${outputName})`);
      lines.push("");
      lines.push(`_Job "${jobName}" not found._`);
      lines.push("");
      return;
    }

    const jobStepRuns = input.stepRuns.filter(
      (sr) => sr.jobRunId === jobRun.id,
    );

    for (const stepRun of jobStepRuns) {
      // Check structured outputs first
      if (stepRun.structuredOutput && outputName in stepRun.structuredOutput) {
        lines.push(
          `${h(level)} ${jobName}.${stepRun.stepName} → ${outputName}`,
        );
        lines.push("");
        lines.push(String(stepRun.structuredOutput[outputName]));
        lines.push("");
      }
      // Check resolved inputs
      else if (stepRun.resolvedInputs && outputName in stepRun.resolvedInputs) {
        lines.push(
          `${h(level)} ${jobName}.${stepRun.stepName} → ${outputName}`,
        );
        lines.push("");
        lines.push(String(stepRun.resolvedInputs[outputName]));
        lines.push("");
      }
      // Fall back to raw output if outputName is "__raw__"
      else if (outputName === "__raw__" && stepRun.output) {
        lines.push(`${h(level)} ${jobName}.${stepRun.stepName}`);
        lines.push("");
        lines.push(stepRun.output);
        lines.push("");
      }
    }
  }

  /**
   * Find a step run by job name and step name.
   */
  private findStepRun(
    input: BFlowExportInput,
    jobName: string,
    stepName: string,
  ): BFlowStepRun | undefined {
    const jobRun = input.jobRuns.find((jr) => jr.jobName === jobName);
    if (!jobRun) return undefined;
    return input.stepRuns.find(
      (sr) => sr.jobRunId === jobRun.id && sr.stepName === stepName,
    );
  }

  /**
   * Generate an HTML report.
   */
  private generateHtml(
    input: BFlowExportInput,
    opts: BFlowExportOptions,
  ): string {
    const md = this.generateMarkdown(input, { ...opts, format: "markdown" });
    // Simple markdown-to-HTML conversion
    const title = input.pipelineName ?? "Pipeline Report";
    const body = md
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/^- (.+)$/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")
      .replace(/```(\w*)\n([\s\S]*?)```/g, "<pre><code>$2</code></pre>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/^(.+)$/gm, (match) => {
        if (match.startsWith("<")) return match;
        return `<p>${match}</p>`;
      });

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 2rem; color: #1a1a2e; line-height: 1.6; }
    h1 { border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; }
    h2 { color: #334155; margin-top: 2rem; }
    h3 { color: #475569; }
    pre { background: #f1f5f9; padding: 1rem; border-radius: 8px; overflow-x: auto; }
    code { font-family: 'JetBrains Mono', monospace; font-size: 0.9em; }
    ul { padding-left: 1.5rem; }
    li { margin-bottom: 0.25rem; }
    strong { color: #0f172a; }
  </style>
</head>
<body>
${body}
</body>
</html>`;
  }

  /**
   * Generate a plain text report.
   */
  private generatePlain(
    input: BFlowExportInput,
    opts: BFlowExportOptions,
  ): string {
    const md = this.generateMarkdown(input, { ...opts, format: "markdown" });
    // Strip markdown formatting
    return md
      .replace(/^#{1,6}\s+/gm, "") // Remove headings
      .replace(/\*\*(.+?)\*\*/g, "$1") // Remove bold
      .replace(/\*([^*]+)\*/g, "$1") // Remove italic
      .replace(/`([^`]+)`/g, "$1") // Remove inline code
      .replace(/^[-*]\s/gm, "  • ") // Replace list markers
      .replace(/```[\s\S]*?```/g, (match) => {
        // Keep code block content but remove fences
        return match.replace(/```\w*/g, "").trim();
      });
  }

  /**
   * Generate an HTML document with only the output docs rendered through
   * the marked parser. Focuses on the content — no job/step metadata included.
   *
   * Ideal for documentation-centric pipelines where you want a clean,
   * polished HTML output of only the generated content.
   */
  private generateHtmlDocs(
    input: BFlowExportInput,
    opts: BFlowExportOptions,
  ): string {
    const title =
      input.reports?.[0]?.label ?? input.pipelineName ?? "Pipeline Report";
    const outputParts: string[] = [];

    // ── Collect content from report configs ─────────────────────────
    if (input.reports && input.reports.length > 0) {
      for (const report of input.reports) {
        const mdLines: string[] = [];
        this.renderReportSection(mdLines, report, input, opts, 0);
        const mdContent = mdLines.join("\n");
        if (mdContent.trim()) {
          outputParts.push(marked.parse(mdContent) as string);
        }
      }
    } else {
      // ── Default: collect all step outputs ─────────────────────────
      for (const jobRun of input.jobRuns) {
        const jobStepRuns = input.stepRuns.filter(
          (sr) => sr.jobRunId === jobRun.id,
        );

        for (const stepRun of jobStepRuns) {
          if (!stepRun.output) continue;

          // Render step output through marked
          const stepLabel = `${jobRun.jobName} / ${stepRun.stepName}`;
          const rendered = marked.parse(stepRun.output) as string;

          outputParts.push(`
            <section class="step-output">
              <div class="step-header">
                <span class="step-badge">${this.escapeHtml(stepLabel)}</span>
              </div>
              <div class="step-body">
                ${rendered}
              </div>
            </section>
          `);
        }
      }
    }

    const bodyContent =
      outputParts.length > 0
        ? outputParts.join("\n")
        : `<div class="empty-state">
             <svg class="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
             </svg>
             <p>No output content available for this report.</p>
           </div>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #1a1a2e;
      background: #f8fafc;
      line-height: 1.7;
      -webkit-font-smoothing: antialiased;
    }
    .container { max-width: 880px; margin: 0 auto; padding: 2rem 1.5rem 4rem; }

    /* ── Header ─────────────────────────────────── */
    header {
      text-align: center;
      padding: 3rem 1.5rem 2rem;
      border-bottom: 1px solid #e2e8f0;
      margin-bottom: 2.5rem;
    }
    header h1 {
      font-size: 2rem;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.02em;
    }
    header p.desc {
      margin-top: 0.75rem;
      color: #64748b;
      font-size: 0.95rem;
    }
    header .meta {
      margin-top: 1rem;
      display: flex;
      justify-content: center;
      gap: 0.75rem;
      flex-wrap: wrap;
      font-size: 0.8rem;
      color: #94a3b8;
    }
    header .meta span {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.3rem 0.75rem;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 999px;
    }

    /* ── Step output sections ────────────────────── */
    .step-output {
      margin-bottom: 2rem;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .step-header {
      padding: 0.6rem 1.25rem;
      background: #f1f5f9;
      border-bottom: 1px solid #e2e8f0;
    }
    .step-badge {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 600;
      color: #475569;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    .step-body {
      padding: 1.5rem 1.75rem;
    }

    /* ── Prose content (rendered from marked) ────── */
    .step-body h1, .step-body h2, .step-body h3,
    .step-body h4, .step-body h5, .step-body h6 {
      color: #0f172a;
      font-weight: 600;
      line-height: 1.3;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
    }
    .step-body h1 { font-size: 1.6rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.3em; }
    .step-body h2 { font-size: 1.3rem; }
    .step-body h3 { font-size: 1.1rem; }
    .step-body p { margin-bottom: 1em; color: #334155; }
    .step-body ul, .step-body ol { padding-left: 1.5em; margin-bottom: 1em; }
    .step-body li { margin-bottom: 0.25em; }
    .step-body strong { color: #0f172a; font-weight: 600; }
    .step-body a { color: #2563eb; text-decoration: underline; text-underline-offset: 2px; }
    .step-body a:hover { color: #1d4ed8; }
    .step-body blockquote {
      border-left: 4px solid #2563eb;
      padding: 0.5em 1em;
      margin: 1em 0;
      background: #f8fafc;
      color: #475569;
      border-radius: 0 6px 6px 0;
    }
    .step-body code {
      font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
      font-size: 0.88em;
      background: #f1f5f9;
      padding: 0.15em 0.4em;
      border-radius: 4px;
      color: #0f172a;
    }
    .step-body pre {
      background: #1e293b;
      color: #e2e8f0;
      padding: 1em 1.25em;
      border-radius: 8px;
      overflow-x: auto;
      margin: 1em 0;
      font-size: 0.88rem;
      line-height: 1.5;
    }
    .step-body pre code {
      background: none;
      padding: 0;
      color: inherit;
      font-size: inherit;
    }
    .step-body table {
      width: 100%;
      border-collapse: collapse;
      margin: 1em 0;
      font-size: 0.9rem;
    }
    .step-body th, .step-body td {
      border: 1px solid #e2e8f0;
      padding: 0.5em 0.75em;
      text-align: left;
    }
    .step-body th {
      background: #f1f5f9;
      font-weight: 600;
      color: #0f172a;
    }
    .step-body td { color: #334155; }
    .step-body hr {
      border: none;
      border-top: 2px solid #e2e8f0;
      margin: 2em 0;
    }
    .step-body img { max-width: 100%; border-radius: 8px; margin: 1em 0; }

    /* ── Empty state ─────────────────────────────── */
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      color: #94a3b8;
    }
    .empty-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 1rem;
      color: #cbd5e1;
    }
    .empty-state p { font-size: 0.95rem; }

    /* ── Footer ──────────────────────────────────── */
    footer {
      text-align: center;
      padding: 2rem 1.5rem 0;
      font-size: 0.75rem;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      margin-top: 3rem;
    }

    /* ── Print ───────────────────────────────────── */
    @media print {
      body { background: #fff; }
      .step-output { break-inside: avoid; box-shadow: none; border-color: #cbd5e1; }
      .step-body pre { background: #f1f5f9 !important; color: #1a1a2e !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${this.escapeHtml(title)}</h1>
      ${
        input.description
          ? `<p class="desc">${this.escapeHtml(input.description)}</p>`
          : ""
      }
      <div class="meta">
        <span>${input.jobRuns.length} job${input.jobRuns.length !== 1 ? "s" : ""}</span>
        <span>${input.stepRuns.length} step${input.stepRuns.length !== 1 ? "s" : ""}</span>
        <span>${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
      </div>
    </header>

    <main>
      ${bodyContent}
    </main>

    <footer>
      Generated by BunnyFlow &mdash; Docs Export
    </footer>
  </div>
</body>
</html>`;
  }

  /**
   * Escape HTML special characters in a string.
   */
  private escapeHtml(str: string): string {
    const amp = String.fromCharCode(38);
    return str
      .replace(/[&]/g, amp + "amp;")
      .replace(/[<]/g, amp + "lt;")
      .replace(/[>]/g, amp + "gt;")
      .replace(/["]/g, amp + "quot;")
      .replace(/[']/g, amp + "#x27;");
  }

  /**
   * Export pipeline run data and return as a downloadable blob.
   */
  exportToBlob(input: BFlowExportInput, options?: BFlowExportOptions): Blob {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const content = this.generate(input, opts);
    const mimeType =
      opts.format === "html" || opts.format === "html-docs"
        ? "text/html"
        : opts.format === "plain"
          ? "text/plain"
          : "text/markdown";
    return new Blob([content], { type: mimeType });
  }

  /**
   * Create a download URL for the export.
   */
  createDownloadUrl(
    input: BFlowExportInput,
    filename?: string,
    options?: BFlowExportOptions,
  ): string {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const blob = this.exportToBlob(input, opts);
    const ext =
      opts.format === "html" || opts.format === "html-docs"
        ? "html"
        : opts.format === "plain"
          ? "txt"
          : "md";
    const name =
      filename ?? `${input.pipelineName ?? "pipeline-report"}.${ext}`;
    const url = URL.createObjectURL(blob);
    return url;
  }
}

// ─── Singleton ──────────────────────────────────────────────────────

export const bflowExportService = new BFlowExportService();
