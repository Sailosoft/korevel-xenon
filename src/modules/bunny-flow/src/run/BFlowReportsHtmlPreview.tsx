/**
 * BFlowReportsHtmlPreview — Consolidated HTML report preview for YAML-configured reports.
 *
 * Generates a single standalone HTML document that combines ALL workflow YAML report
 * outputs into one view. Report labels are used to construct an outline/table of
 * contents, and each report's content is rendered as a level-1 section using the
 * RenderModule's buildExportHtml engine for proper format-aware rendering.
 *
 * The generated HTML includes:
 * - Table of contents using report labels
 * - Each report output rendered via RenderModule (markdown, plain, json, html, etc.)
 * - A download button built into the page
 */

"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button, Modal } from "@heroui/react";
import { Download } from "lucide-react";
import { RenderEngine, registerBuiltinAdapters } from "@/src/modules/render";
import type { RenderFormat } from "@/src/modules/render";

export interface ReportItem {
  label: string;
  name: string;
  content: string;
  /** Format for rendering this report's content. Defaults to "markdown". */
  format?: RenderFormat;
}

export interface BFlowReportsHtmlPreviewProps {
  /** Whether the modal is open */
  open: boolean;
  /** Called when the modal is dismissed */
  onClose: () => void;
  /** The pipeline name */
  pipelineName?: string;
  /** Resolved report items with label, content, and format */
  reports: ReportItem[];
  /** Optional filename for download */
  filename?: string;
}

/**
 * Escape HTML entities for safe embedding.
 */
function esc(str: string): string {
  return str
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, "&#34;");
}

/**
 * Build the full HTML document for the reports preview using the RenderModule engine.
 * Each report section's content is rendered via RenderEngine.renderHtml() for clean
 * format-aware HTML fragments without full-document wrapping or client-side scripts.
 */
function buildReportsHtml(
  pipelineName: string,
  reports: ReportItem[],
): string {
  const now = new Date().toISOString();

  // Table of Contents
  const tocItems = reports
    .map(
      (r, i) =>
        `<li><a href="#report-${i}" class="text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 text-sm font-medium no-underline transition-colors">${esc(r.label || r.name)}</a></li>`,
    )
    .join("\n");

  // Render each report section via RenderEngine.renderHtml() for clean fragment output
  const sections = reports
    .map((r, i) => {
      const format = r.format ?? "markdown";
      let bodyContent: string;
      try {
        const result = RenderEngine.renderHtml(format, r.content || "_No content available._");
        bodyContent = result.html.html;
      } catch {
        bodyContent = `<div class="text-slate-400 italic p-4">No renderer available for format "${format}".</div>`;
      }

      return `
      <section id="report-${i}" class="mb-12 scroll-mt-20">
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-3 mb-6">
          ${esc(r.label || r.name)}
        </h2>
        <div class="report-content">
          ${bodyContent}
        </div>
      </section>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(pipelineName)} — Reports</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: { extend: {} }
    }
  </script>
  <style>
    html { scroll-behavior: smooth; }
    body { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
    .report-content h1 { font-size: 1.4rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 0.75rem; }
    .report-content h2 { font-size: 1.2rem; font-weight: 600; margin-top: 1.25rem; margin-bottom: 0.5rem; }
    .report-content h3 { font-size: 1.1rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.5rem; }
    .report-content p { margin: 0.75rem 0; line-height: 1.7; }
    .report-content pre { background: #f1f5f9; padding: 1rem; border-radius: 0.75rem; overflow-x: auto; margin: 0.75rem 0; border: 1px solid #e2e8f0; }
    .dark .report-content pre { background: #1e293b; border-color: #334155; }
    .report-content code { font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 0.85rem; }
    .report-content table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    .report-content th, .report-content td { border: 1px solid #e2e8f0; padding: 0.5rem 0.75rem; text-align: left; }
    .dark .report-content th, .dark .report-content td { border-color: #334155; }
    .report-content th { background: #f8fafc; font-weight: 600; }
    .dark .report-content th { background: #1e293b; }
    .report-content img { max-width: 100%; border-radius: 0.5rem; }
    .report-content a { color: #2563eb; text-decoration: none; }
    .report-content a:hover { text-decoration: underline; }
    @media print {
      .no-print { display: none !important; }
      body { font-size: 11pt; }
    }
  </style>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
</head>
<body class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-screen">
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- ── Header ────────────────────────────────────────────── -->
    <header class="mb-10">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            ${esc(pipelineName)}
          </h1>
          <p class="mt-1 text-slate-500 dark:text-slate-400 text-sm">
            Workflow Reports &mdash; ${reports.length} section${reports.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div class="no-print flex items-center gap-2">
          <button onclick="window.print()" class="inline-flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
            Print
          </button>
        </div>
      </div>
    </header>

    <!-- ── Table of Contents ─────────────────────────────────── -->
    <nav class="no-print mb-10 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
      <h2 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
        Report Outline
      </h2>
      <ul class="space-y-1.5">
        ${tocItems}
      </ul>
    </nav>

    <!-- ── Report Sections ───────────────────────────────────── -->
    <div class="space-y-8">
      ${sections}
    </div>

    <!-- ── Footer ────────────────────────────────────────────── -->
    <footer class="no-print border-t border-slate-200 dark:border-slate-700 mt-12 pt-6 text-center text-xs text-slate-400 dark:text-slate-500">
      <p>Generated by BunnyFlow Pipeline Reports &mdash; ${now}</p>
    </footer>
  </div>
</body>
</html>`;
}

/**
 * Modal that generates and previews a consolidated HTML report for all YAML-configured
 * report items. Report labels are used for the outline/table of contents, and each
 * report's output is rendered via the RenderModule's buildExportHtml engine.
 */
export function BFlowReportsHtmlPreview({
  open,
  onClose,
  pipelineName,
  reports,
  filename,
}: BFlowReportsHtmlPreviewProps) {
  const [htmlUrl, setHtmlUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const adaptersRegistered = useRef(false);

  // Register built-in render adapters once on mount
  useEffect(() => {
    if (!adaptersRegistered.current) {
      registerBuiltinAdapters();
      adaptersRegistered.current = true;
    }
  }, []);

  useEffect(() => {
    if (!open) {
      if (htmlUrl) {
        URL.revokeObjectURL(htmlUrl);
        setHtmlUrl(null);
      }
      return;
    }

    setGenerating(true);

    const id = setTimeout(() => {
      try {
        const html = buildReportsHtml(pipelineName ?? "Pipeline Reports", reports);
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        setHtmlUrl(url);
      } catch {
        // Generation failed silently
      } finally {
        setGenerating(false);
      }
    }, 0);

    return () => clearTimeout(id);
  }, [open, pipelineName, reports]);

  useEffect(() => {
    return () => {
      if (htmlUrl) URL.revokeObjectURL(htmlUrl);
    };
  }, []);

  const handleDownload = () => {
    if (!htmlUrl) return;
    const a = document.createElement("a");
    a.href = htmlUrl;
    a.download = filename ?? "pipeline-reports.html";
    a.click();
  };

  return (
    <Modal.Backdrop isOpen={open} onClick={onClose}>
      <Modal.Container>
        <Modal.Dialog
          className="max-w-5xl max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <Modal.CloseTrigger onClick={onClose} />
          <Modal.Header>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-foreground">
                Reports: {pipelineName ?? "Pipeline"}
              </span>
            </div>
            <p className="text-xs text-default-400 mt-0.5">
              {reports.length} report section{reports.length !== 1 ? "s" : ""} &mdash; rendered via RenderModule
            </p>
          </Modal.Header>

          <Modal.Body className="overflow-hidden p-0" style={{ minHeight: "60vh" }}>
            {generating ? (
              <div className="flex items-center justify-center h-64 text-default-400 text-sm">
                Generating reports HTML...
              </div>
            ) : htmlUrl ? (
              <iframe
                src={htmlUrl}
                className="w-full border-0"
                style={{ height: "70vh" }}
                title="Reports HTML Preview"
                sandbox="allow-scripts allow-same-origin"
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-default-400 text-sm">
                Failed to generate reports preview
              </div>
            )}
          </Modal.Body>

          <Modal.Footer>
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onPress={onClose}>
                Close
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onPress={handleDownload}
                isDisabled={!htmlUrl}
              >
                <Download className="w-4 h-4" />
                Download HTML
              </Button>
            </div>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
