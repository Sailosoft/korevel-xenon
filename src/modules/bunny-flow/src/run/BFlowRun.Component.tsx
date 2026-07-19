"use client";

/**
 * BFlowRunComponent — Presentational pipeline run view.
 *
 * All stateful logic is extracted into useBFlowRun() and its sub-hooks.
 * This component only consumes the returned state and renders the UI.
 *
 * ─── Features ────────────────────────────────────────────────────────
 * 1. View Raw YAML — Modal to inspect the workflow template YAML schema.
 * 2. View Report   — Modal that renders report output via RenderView.
 * 3. Runs History  — Sidebar list of all persisted pipeline runs.
 * 4. Snapshot-based Export — Uses the workflow snapshot stored on each
 *    pipeline run, so exported HTML / reports always match the run-time
 *    workflow structure, even if the template has been edited since.
 * 5. Save Reports  — Generate and persist a final report (HTML / markdown)
 *    that can be downloaded later from the reports list.
 *
 * ─── Export ──────────────────────────────────────────────────────────
 * Supports exporting pipeline run results to a styled HTML document with
 * Tailwind CSS (via CDN). The export includes all job and step runs with
 * their statuses, outputs, variables, and metadata in a polished layout.
 */

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Play,
  Loader2,
  XCircle,
  Clock,
  FileBarChart,
  ArrowLeft,
  ChevronRight,
  Beaker,
  Download,
  FileCode,
  History,
  Eye,
  Save,
  FileText,
} from "lucide-react";
import { Button, Card, Dropdown, Label, Separator } from "@heroui/react";
import { useBFlowRun } from "./BFlowRun.Hooks";
import { BFlowStatusBadge, getStatusConfig } from "./BFlowStatusBadge";
import { BFlowStepNode } from "./BFlowStepNode";
import { BFlowStepDetailsModal } from "./BFlowStepDetailsModal";
import { BFlowOutputModal } from "./BFlowOutputModal";
import { BFlowComputedInputsModal } from "./BFlowComputedInputsModal";
import { BFlowRawYamlModal } from "./BFlowRawYamlModal";
import { BFlowReportViewModal } from "./BFlowReportViewModal";
import { BFlowHtmlPreviewModal } from "./BFlowHtmlPreviewModal";
import { BFlowReportPreviewModal } from "./BFlowReportPreviewModal";
import { BFlowReportsHtmlPreview } from "./BFlowReportsHtmlPreview";
import type { ReportItem } from "./BFlowReportsHtmlPreview";
import {
  BFlowLoadingState,
  BFlowErrorState,
  BFlowTestRunBanner,
} from "./BFlowRunState";
import { bflowDB } from "../database/BFlowDatabase";
import { bflowRunDB } from "./BFlowRunDB";
import { bflowTailwindExportService } from "../export/BFlowExport.TailwindService";
import type {
  BFlowStep,
  BFlowWorkflowReport,
  BFlowWorkflowJob,
} from "../workflow/BFlowWorkflow.Types";
import type { RenderFormat } from "@/src/modules/render";
import type {
  BFlowStepRun,
  BFlowPipelineRunEntity,
  BFlowJobRun,
  BFlowRunSnapshot,
} from "./BFlowRun.Types";
import type { BFlowPipelineReportEntity } from "../report/BFlowReport.Types";


export default function BFlowRunComponent() {
  const params = useParams();
  const router = useRouter();

  // Supports both:
  //   pipeline/[pipelineId]/run        → params.id
  //   flow/[flowId]/pipeline/[pipelineId]/run  → params.pipelineId
  const pipelineId = (params?.pipelineId ?? params?.id) as string | undefined;

  const {
    pipeline,
    template,
    variableGroup,
    error,
    clearError,
    loading,
    jobs,
    resolvedVariables,
    selectedJobIndex,
    setSelectedJobIndex,
    viewStep,
    setViewStep,
    activeRun,
    jobRuns,
    stepRuns,
    currentJob,
    currentJobRun,
    currentStepRuns,
    isRunning,
    startPipelineRun,
    generateReport,
    // ── Test Run ───────────────────────────────────────────────
    testRun,
    testJobRuns,
    testStepRuns,
    isTestRunning,
    testError,
    startTestRun,
    clearTestRun,
    currentJobRunEffective,
    currentStepRunsEffective,
    hasTestRunResult,
  } = useBFlowRun(pipelineId);

  // ── Modal State ───────────────────────────────────────────────
  const [viewOutput, setViewOutput] = useState<{
    step: BFlowStep;
    stepRun?: BFlowStepRun;
  } | null>(null);

  const [viewComputedInputs, setViewComputedInputs] = useState<{
    step: BFlowStep;
    stepRun?: BFlowStepRun;
  } | null>(null);

  // ── Raw YAML Modal State ────────────────────────────────────
  const [viewRawYaml, setViewRawYaml] = useState(false);

  // ── Report View Modal State ──────────────────────────────────
  const [viewReport, setViewReport] = useState<{
    report: BFlowWorkflowReport;
    content?: string;
  } | null>(null);

  // ── HTML Preview Modal State ──────────────────────────────────
  const [viewHtmlPreview, setViewHtmlPreview] = useState(false);

  // ── Report Preview Modal State ────────────────────────────────
  const [reportPreview, setReportPreview] = useState<{
    content: string;
    title: string;
    filename: string;
  } | null>(null);

  // ── Reports HTML Preview State (consolidated YAML reports) ────
  const [viewReportsHtml, setViewReportsHtml] = useState(false);

  // ── Runs History State (Task 3) ───────────────────────────────
  const [allRuns, setAllRuns] = useState<BFlowPipelineRunEntity[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  // ── Saved Reports State ───────────────────────────────────────
  const [savedReports, setSavedReports] = useState<BFlowPipelineReportEntity[]>([]);
  const [savingReport, setSavingReport] = useState(false);

  // ── Historical run data (when viewing a non-active run) ───────
  const [selectedRunData, setSelectedRunData] = useState<{
    jobRuns: BFlowJobRun[];
    stepRuns: BFlowStepRun[];
    snapshot?: BFlowRunSnapshot;
  } | null>(null);

  // Load all historical runs for this pipeline
  useEffect(() => {
    if (!pipelineId) {
      setAllRuns([]);
      return;
    }
    let cancelled = false;
    bflowDB.pipelineRunsRepo
      .getByPipelineId(pipelineId)
      .then((runs) => {
        if (!cancelled) setAllRuns(runs);
      })
      .catch(() => {
        if (!cancelled) setAllRuns([]);
      });
    return () => {
      cancelled = true;
    };
  }, [pipelineId, activeRun?.id, activeRun?.status]);

  // Auto-select active run when runs list changes
  useEffect(() => {
    if (!selectedRunId && activeRun) {
      setSelectedRunId(activeRun.id);
    }
  }, [activeRun, selectedRunId]);

  // Load selected historical run data (including snapshot)
  useEffect(() => {
    if (!selectedRunId) {
      setSelectedRunData(null);
      return;
    }
    // If the selected run is the active run, use the main state
    if (selectedRunId === activeRun?.id) {
      setSelectedRunData(null);
      return;
    }
    let cancelled = false;
    bflowRunDB.getRunDataForReport(selectedRunId)
      .then((data) => {
        if (!cancelled) {
          setSelectedRunData({
            jobRuns: data.jobRuns,
            stepRuns: data.stepRuns,
            snapshot: data.pipelineRun?.snapshot,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setSelectedRunData(null);
      });
    return () => { cancelled = true; };
  }, [selectedRunId, activeRun?.id]);

  // Load saved reports for the selected run
  useEffect(() => {
    if (!selectedRunId) {
      setSavedReports([]);
      return;
    }
    let cancelled = false;
    bflowDB.pipelineReports
      .toArray()
      .then((reports) => {
        if (!cancelled) {
          setSavedReports(reports.filter((r) => r.runId === selectedRunId));
        }
      })
      .catch(() => {
        if (!cancelled) setSavedReports([]);
      });
    return () => { cancelled = true; };
  }, [selectedRunId, savedReports.length]);

  // ── Snapshot-aware effective data ──────────────────────────────

  /**
   * When viewing a historical run, use its snapshot jobs for output-type
   * resolution and structure. Otherwise fall through to the current template.
   */
  const effectiveSnapshotJobs = useMemo((): BFlowWorkflowJob[] => {
    if (selectedRunData?.snapshot?.jobs?.length) return selectedRunData.snapshot.jobs;
    if (activeRun?.snapshot?.jobs?.length) return activeRun.snapshot.jobs;
    return jobs;
  }, [selectedRunData, activeRun, jobs]);

  const effectiveSnapshotReports = useMemo((): BFlowWorkflowReport[] => {
    if (selectedRunData?.snapshot?.reports?.length) return selectedRunData.snapshot.reports;
    if (activeRun?.snapshot?.reports?.length) return activeRun.snapshot.reports;
    return template?.template?.reports ?? [];
  }, [selectedRunData, activeRun, template]);

  const effectiveSnapshotPipelineName = useMemo((): string => {
    if (selectedRunData?.snapshot?.pipelineName) return selectedRunData.snapshot.pipelineName;
    if (activeRun?.snapshot?.pipelineName) return activeRun.snapshot.pipelineName;
    return pipeline?.name ?? template?.name ?? "Pipeline Report";
  }, [selectedRunData, activeRun, pipeline, template]);

  const effectiveSnapshotDescription = useMemo((): string | undefined => {
    if (selectedRunData?.snapshot?.description) return selectedRunData.snapshot.description;
    if (activeRun?.snapshot?.description) return activeRun.snapshot.description;
    return template?.description;
  }, [selectedRunData, activeRun, template]);

  /**
   * The job/step runs to use for export/report generation.
   * Prefers historical run data when viewing a non-active run.
   */
  const effectiveJobRuns = useMemo((): BFlowJobRun[] => {
    if (selectedRunData) return selectedRunData.jobRuns;
    return hasTestRunResult ? testJobRuns : jobRuns;
  }, [selectedRunData, hasTestRunResult, testJobRuns, jobRuns]);

  const effectiveStepRuns = useMemo((): BFlowStepRun[] => {
    if (selectedRunData) return selectedRunData.stepRuns;
    return hasTestRunResult ? testStepRuns : stepRuns;
  }, [selectedRunData, hasTestRunResult, testStepRuns, stepRuns]);

  // ── Report content resolver ───────────────────────────────────
  const resolvedReportContent = useMemo(() => {
    if (!viewReport || !viewReport.report.source) return undefined;

    // Parse source pattern: "jobName.stepName" or "jobName.stepName.outputs.fieldName"
    const source = viewReport.report.source;
    const match = source.match(/^([^.]+)\.([^.]+?)(?:\.outputs\.([^.]+))?$/);
    if (!match) return undefined;

    const jobName = match[1];
    const stepName = match[2];

    // Find the job run matching the job name
    const matchingJobRun = effectiveJobRuns.find(
      (jr) => jr.jobName === jobName || jr.jobId === jobName,
    );
    if (!matchingJobRun) return undefined;

    // Find the step run within that job run matching the step name
    const stepRun = effectiveStepRuns.find(
      (sr) =>
        sr.jobRunId === matchingJobRun.id &&
        (sr.stepName === stepName || sr.stepId === stepName),
    );

    return stepRun?.output;
  }, [viewReport, effectiveJobRuns, effectiveStepRuns]);

  // ── Resolved report items for consolidated Reports HTML ──────
  const resolvedReportItems = useMemo((): ReportItem[] => {
    const reports = effectiveSnapshotReports;
    if (!reports || reports.length === 0) {
      // No reports defined — return empty so we use default full-output rendering
      return [];
    }

    const STEP_FORMAT_MAP: Record<string, RenderFormat> = {
      plain: "plain",
      markdown: "markdown",
      json: "json",
      html: "html",
      csv: "csv",
      json_array: "json",
      yaml: "markdown",
    };

    return reports.map((r) => {
      const content = resolveReportOutput(r.source, effectiveJobRuns, effectiveStepRuns, effectiveSnapshotJobs) ?? "";
      // Resolve format from the source step's outputType
      const source = r.source || "";
      const match = source.match(/^([^.]+)\.([^.]+?)(?:\.outputs\.([^.]+))?$/);
      let format: RenderFormat = "markdown";
      if (match) {
        const jobName = match[1];
        const stepName = match[2];
        const job = effectiveSnapshotJobs.find((j) => j.name === jobName || j.id === jobName);
        const step = job?.steps?.find((s) => s.name === stepName || s.id === stepName);
        if (step?.outputType) {
          format = STEP_FORMAT_MAP[step.outputType] ?? "markdown";
        }
      }
      return { label: r.label || r.name, name: r.name, content, format };
    });
  }, [effectiveSnapshotReports, effectiveJobRuns, effectiveStepRuns, effectiveSnapshotJobs]);

  // ── HTML Export Input (memoized for preview modal) ────────────
  const htmlExportInput = useMemo(() => {
    if (effectiveJobRuns.length === 0 && effectiveStepRuns.length === 0) {
      return null;
    }

    return {
      pipelineName: effectiveSnapshotPipelineName,
      description: effectiveSnapshotDescription,
      jobRuns: effectiveJobRuns,
      stepRuns: effectiveStepRuns,
      reports: effectiveSnapshotReports,
      // Pass snapshot jobs so the export service can resolve step output types
      jobs: effectiveSnapshotJobs,
    };
  }, [effectiveJobRuns, effectiveStepRuns, effectiveSnapshotPipelineName, effectiveSnapshotDescription, effectiveSnapshotReports, effectiveSnapshotJobs]);

  // ── Generate Full Report Content ─────────────────────────────
  /** Builds full report markdown with all jobs/steps output. */
  const buildFullReportContent = useCallback((): string | null => {
    if (effectiveJobRuns.length === 0 && effectiveStepRuns.length === 0) return null;

    const lines: string[] = [];
    const now = new Date().toLocaleString();
    const status = selectedRunData
      ? (selectedRunData.jobRuns.some((jr) => jr.status === "failed") ? "failed" : "succeeded")
      : (hasTestRunResult ? testRun?.status : activeRun?.status) ?? "N/A";
    lines.push(`# Pipeline Full Report: ${effectiveSnapshotPipelineName}`);
    lines.push(`**Generated**: ${now}`);
    lines.push(`**Status**: ${status}`);
    lines.push("", "---", "");

    for (const jr of effectiveJobRuns) {
      lines.push(`## Job: ${jr.jobName}`);
      lines.push(`**Status**: ${jr.status}`, "");
      const srs = effectiveStepRuns.filter((s) => s.jobRunId === jr.id);
      for (const sr of srs) {
        lines.push(`### ${sr.stepName}`);
        lines.push(`- **Status**: ${sr.status}`);
        if (sr.startedAt && sr.completedAt) {
          const dur = Math.round((sr.completedAt.getTime() - sr.startedAt.getTime()) / 1000);
          lines.push(`- **Duration**: ${dur}s`);
        }
        if (sr.output) lines.push("", "```", sr.output, "```");
        if (sr.error) lines.push("", "**Error**:", "```", sr.error, "```");
        lines.push("");
      }
    }
    return lines.join("\n");
  }, [effectiveJobRuns, effectiveStepRuns, effectiveSnapshotPipelineName, selectedRunData, hasTestRunResult, testRun, activeRun]);

  /** Opens report preview for full report */
  const generateFullReportPreview = useCallback(() => {
    const content = buildFullReportContent();
    if (!content) return;
    setReportPreview({
      content,
      title: "Full Report",
      filename: `${pipeline?.slug ?? "pipeline"}-full-report`,
    });
  }, [buildFullReportContent, pipeline]);

  // ── Generate Report via YAML Config ──────────────────────────
  /** Builds report content based on YAML reports config, falling back to full. */
  const buildYamlReportContent = useCallback((): string | null => {
    if (effectiveJobRuns.length === 0 && effectiveStepRuns.length === 0) return null;

    const lines: string[] = [];
    const now = new Date().toLocaleString();
    const status = selectedRunData
      ? (selectedRunData.jobRuns.some((jr) => jr.status === "failed") ? "failed" : "succeeded")
      : (hasTestRunResult ? testRun?.status : activeRun?.status) ?? "N/A";
    lines.push(`# Pipeline Report: ${effectiveSnapshotPipelineName}`);
    lines.push(`**Generated**: ${now}`);
    lines.push(`**Status**: ${status}`);
    lines.push("", "---", "");

    const reports = effectiveSnapshotReports;
    if (reports && reports.length > 0) {
      for (const r of reports) {
        const content = resolveReportOutput(r.source, effectiveJobRuns, effectiveStepRuns, effectiveSnapshotJobs);
        lines.push(`## ${r.label || r.name}`);
        lines.push(`**Source**: \`${r.source}\``, "");
        lines.push(content ?? "_No output available._");
        lines.push("", "---", "");
      }
    } else {
      // Fallback: full jobs/steps output
      for (const jr of effectiveJobRuns) {
        lines.push(`## Job: ${jr.jobName}`);
        lines.push(`**Status**: ${jr.status}`, "");
        const srs = effectiveStepRuns.filter((s) => s.jobRunId === jr.id);
        for (const sr of srs) {
          lines.push(`### ${sr.stepName}`);
          lines.push(`- **Status**: ${sr.status}`);
          if (sr.startedAt && sr.completedAt) {
            const dur = Math.round((sr.completedAt.getTime() - sr.startedAt.getTime()) / 1000);
            lines.push(`- **Duration**: ${dur}s`);
          }
          if (sr.output) lines.push("", "```", sr.output, "```");
          if (sr.error) lines.push("", "**Error**:", "```", sr.error, "```");
          lines.push("");
        }
      }
    }
    return lines.join("\n");
  }, [effectiveJobRuns, effectiveStepRuns, effectiveSnapshotPipelineName, effectiveSnapshotReports, effectiveSnapshotJobs, selectedRunData, hasTestRunResult, testRun, activeRun]);

  /** Opens report preview for YAML config report */
  const generateYamlReport = useCallback(() => {
    const content = buildYamlReportContent();
    if (!content) return;
    const label = effectiveSnapshotReports?.length ? "yaml-config" : "full-report";
    setReportPreview({
      content,
      title: effectiveSnapshotReports?.length ? "Report (YAML Config)" : "Report (Full Output)",
      filename: `${effectiveSnapshotPipelineName.toLowerCase().replace(/\s+/g, "-")}-${label}`,
    });
  }, [buildYamlReportContent, effectiveSnapshotReports, effectiveSnapshotPipelineName]);

  /** Resolve a report source pattern to step output content. */
  function resolveReportOutput(
    source: string,
    jobRunsArr: BFlowJobRun[],
    stepRunsArr: BFlowStepRun[],
    workflowJobs: BFlowWorkflowJob[],
  ): string | undefined {
    const m = source.match(/^([^.]+)\.([^.]+?)(?:\.outputs\.([^.]+))?$/);
    if (!m) return undefined;
    const jr = jobRunsArr.find((r) => r.jobName === m[1] || r.jobId === m[1]);
    if (!jr) return undefined;
    const sr = stepRunsArr.find((s) => s.jobRunId === jr.id && (s.stepName === m[2] || s.stepId === m[2]));
    return sr?.output;
  }

  // ── Save Report (persist to DB for later download) ───────────

  const handleSaveReport = useCallback(async () => {
    if (!selectedRunId) return;
    setSavingReport(true);
    try {
      // Generate the full Tailwind HTML report
      const input = htmlExportInput;
      if (!input) return;

      const html = bflowTailwindExportService.generate(input, {
        includeDescription: true,
        includeResolvedPrompts: false,
        includeResolvedInputs: false,
      });

      const now = new Date();
      const reportId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const report: BFlowPipelineReportEntity = {
        id: reportId,
        pipelineId: pipeline?.id ?? "",
        runId: selectedRunId,
        templateId: pipeline?.templateId ?? "",
        flowId: pipeline?.flowId ?? "",
        variableGroupId: pipeline?.variableGroupId ?? "",
        storeId: "",
        type: "html",
        title: `${effectiveSnapshotPipelineName} — ${now.toLocaleDateString()}`,
        filename: `${effectiveSnapshotPipelineName.toLowerCase().replace(/\s+/g, "-")}-report`,
        content: html,
        createdAt: now,
        updatedAt: now,
      };

      await bflowDB.pipelineReports.add(report);
      // Refresh saved reports list
      const reports = await bflowDB.pipelineReports.toArray();
      setSavedReports(reports.filter((r) => r.runId === selectedRunId));
    } catch (err) {
      console.error("[BFlowRun] Failed to save report:", err);
    } finally {
      setSavingReport(false);
    }
  }, [selectedRunId, htmlExportInput, pipeline, effectiveSnapshotPipelineName]);

  const handleDownloadSavedReport = useCallback((report: BFlowPipelineReportEntity) => {
    if (!report.content) return;
    const blob = new Blob([report.content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.filename ?? "report"}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // ── Render ────────────────────────────────────────────────────

  if (!pipeline) {
    if (error) return <BFlowErrorState message={error} />;
    if (loading) return <BFlowLoadingState />;
    return <BFlowLoadingState />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-default-50">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-default-100">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onPress={() => router.back()}
                className="text-default-400 min-w-0 px-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-lg font-bold text-foreground">
                  {pipeline.name}
                </h1>
                <p className="text-xs text-default-400">
                  {template?.name ?? "Loading template..."}
                  {variableGroup && ` • ${variableGroup.name}`}
                  {pipeline.slug && ` • ${pipeline.slug}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeRun && !hasTestRunResult && !selectedRunData && (
                <BFlowStatusBadge status={activeRun.status} />
              )}
              {hasTestRunResult && (
                <BFlowStatusBadge status={testRun!.status} />
              )}

              <Dropdown>
                <Dropdown.Trigger>
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 cursor-pointer transition-colors select-none"
                    role="button"
                    tabIndex={0}
                  >
                    <Download className="w-4 h-4" />
                    Run Options
                  </span>
                </Dropdown.Trigger>
                <Dropdown.Popover>
                  <Dropdown.Menu aria-label="Run options">
                    {/* ── Generate Full Report ────────────────────── */}
                    <Dropdown.Item
                      key="generate-full-report"
                      onPress={generateFullReportPreview}
                      isDisabled={effectiveJobRuns.length === 0}
                    >
                      <FileBarChart className="w-4 h-4" />
                      <Label>Generate Full Report</Label>
                    </Dropdown.Item>

                    {/* ── Generate Report from YAML Config ────────── */}
                    <Dropdown.Item
                      key="generate-yaml-report"
                      onPress={generateYamlReport}
                      isDisabled={effectiveJobRuns.length === 0}
                    >
                      <FileBarChart className="w-4 h-4" />
                      <Label>Generate from YAML Config</Label>
                    </Dropdown.Item>

                    <Separator className="my-1" />

                    {/* ── Generate & Save Report ────────────────── */}
                    <Dropdown.Item
                      key="save-report"
                      onPress={handleSaveReport}
                      isDisabled={effectiveJobRuns.length === 0 || savingReport || !selectedRunId}
                    >
                      <Save className="w-4 h-4" />
                      <Label>{savingReport ? "Saving..." : "Generate & Save Report"}</Label>
                    </Dropdown.Item>

                    <Separator className="my-1" />

                    {/* ── View HTML ──────────────────────────────── */}
                    <Dropdown.Item
                      key="view-html-preview"
                      onPress={() => setViewHtmlPreview(true)}
                      isDisabled={!htmlExportInput}
                    >
                      <Eye className="w-4 h-4" />
                      <Label>View HTML</Label>
                    </Dropdown.Item>

                    <Separator className="my-1" />

                    {/* ── View Raw YAML ───────────────────────── */}
                    <Dropdown.Item
                      key="view-raw-yaml"
                      onPress={() => setViewRawYaml(true)}
                      isDisabled={!template?.templateYaml}
                    >
                      <FileCode className="w-4 h-4" />
                      <Label>View Raw YAML</Label>
                    </Dropdown.Item>

                    {/* ── View Reports HTML (consolidated) ────────── */}
                    {resolvedReportItems.length > 0 && (
                      <>
                        <Separator className="my-1" />
                        <Dropdown.Item
                          key="view-reports-html"
                          onPress={() => setViewReportsHtml(true)}
                        >
                          <FileBarChart className="w-4 h-4" />
                          <Label>View Reports HTML</Label>
                        </Dropdown.Item>
                      </>
                    )}
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>

              {/* ── Test Run Button ──────────────────────────────── */}
              <Button
                variant="ghost"
                size="sm"
                className="border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 data-[hover=true]:bg-violet-100"
                onPress={startTestRun}
                isDisabled={isTestRunning || isRunning}
              >
                {isTestRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Beaker className="w-4 h-4" />
                    Test Run
                  </>
                )}
              </Button>

              <Button
                variant="primary"
                size="sm"
                onPress={startPipelineRun}
                isDisabled={isRunning || isTestRunning}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Run Pipeline
                  </>
                )}
              </Button>
            </div>
          </div>

          {hasTestRunResult && (
            <div className="mt-3">
              <BFlowTestRunBanner
                status={testRun?.status}
                onClearTestRun={clearTestRun}
              />
            </div>
          )}

          {error && (
            <div className="mt-3 bg-danger-50 border border-danger-200 rounded-xl p-3 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-danger flex-shrink-0" />
              <p className="text-sm text-danger">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-danger min-w-0 px-2"
                onPress={clearError}
              >
                Dismiss
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* ── Job Tabs (Sidebar) ──────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="bg-background rounded-2xl border border-default-100 overflow-hidden">
              <div className="p-4 border-b border-default-100">
                <h2 className="text-sm font-semibold text-default-700">Jobs</h2>
                <p className="text-xs text-default-400 mt-0.5">
                  {jobs.length} job{jobs.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="p-2 space-y-1">
                {jobs.map((job, index) => {
                  // Match job run by jobId, falling back to job.name
                  // for templates without explicit IDs in YAML
                  const jobKey = job.id || job.name;
                  // Use effective runs: prefer test run when available
                  const effectiveJobRunsLocal = hasTestRunResult
                    ? testJobRuns
                    : jobRuns;
                  const jobRun = effectiveJobRunsLocal?.find(
                    (jr) => jr.jobId === jobKey,
                  );
                  const cfg = getStatusConfig(jobRun?.status);

                  return (
                    <button
                      key={job.id}
                      onClick={() => setSelectedJobIndex(index)}
                      className={`w-full text-left p-3 rounded-xl transition-all ${
                        index === selectedJobIndex
                          ? "bg-success-50 border border-success-200 shadow-sm"
                          : "hover:bg-default-50 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cfg.color}>{cfg.icon}</div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium truncate ${
                              index === selectedJobIndex
                                ? "text-success-700"
                                : "text-default-700"
                            }`}
                          >
                            {job.name}
                          </p>
                          <p className="text-xs text-default-400">
                            {jobRun ? cfg.label : `${job.steps.length} steps`}
                          </p>
                        </div>
                        <ChevronRight
                          className={`w-4 h-4 ${
                            index === selectedJobIndex
                              ? "text-success"
                              : "text-default-300"
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <Card className="mt-4 p-4 bg-background border-default-100">
              <h3 className="text-xs font-semibold text-default-500 uppercase tracking-wider mb-3">
                {selectedRunData ? "Historical Run Summary" : hasTestRunResult ? "Test Run Summary" : "Run Summary"}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-default-500">Variables</span>
                  <span className="text-default-700 font-medium">
                    {resolvedVariables.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-default-500">Jobs Run</span>
                  <span className="text-default-700 font-medium">
                    {selectedRunData
                      ? selectedRunData.jobRuns.length
                      : hasTestRunResult
                        ? (testJobRuns?.length ?? 0)
                        : (jobRuns?.length ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-default-500">Steps Executed</span>
                  <span className="text-default-700 font-medium">
                    {selectedRunData
                      ? selectedRunData.stepRuns.length
                      : hasTestRunResult
                        ? (testStepRuns?.length ?? 0)
                        : (stepRuns?.length ?? 0)}
                  </span>
                </div>
                {selectedRunData
                  ? null
                  : hasTestRunResult
                    ? testRun?.startedAt && (
                        <div className="flex justify-between">
                          <span className="text-default-500">Started</span>
                          <span className="text-default-700 text-xs">
                            {testRun.startedAt.toLocaleTimeString()}
                          </span>
                        </div>
                      )
                    : activeRun?.startedAt && (
                        <div className="flex justify-between">
                          <span className="text-default-500">Started</span>
                          <span className="text-default-700 text-xs">
                            {activeRun.startedAt.toLocaleTimeString()}
                          </span>
                        </div>
                      )}
              </div>
            </Card>

            {/* ── Saved Reports ─────────────────────────────────── */}
            {savedReports.length > 0 && (
              <Card className="mt-4 p-4 bg-background border-default-100">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-default-400" />
                  <h3 className="text-xs font-semibold text-default-500 uppercase tracking-wider">
                    Saved Reports
                  </h3>
                  <span className="text-xs text-default-400 ml-auto">
                    {savedReports.length}
                  </span>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {savedReports.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => handleDownloadSavedReport(report)}
                      className="w-full text-left p-2.5 rounded-xl transition-all hover:bg-default-50 border border-transparent flex items-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-default-700 truncate">
                          {report.title ?? report.filename ?? "Report"}
                        </p>
                        <p className="text-[10px] text-default-400">
                          {report.createdAt.toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
            )}

            {/* ── Runs History (Task 3) ─────────────────────────── */}
            {allRuns.length > 0 && (
              <Card className="mt-4 p-4 bg-background border-default-100">
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-default-400" />
                  <h3 className="text-xs font-semibold text-default-500 uppercase tracking-wider">
                    Run History
                  </h3>
                  <span className="text-xs text-default-400 ml-auto">
                    {allRuns.length} run{allRuns.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {allRuns.map((run) => {
                    const cfg = getStatusConfig(run.status);
                    const isSelected = selectedRunId === run.id;
                    return (
                      <button
                        key={run.id}
                        onClick={() => setSelectedRunId(run.id)}
                        className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center gap-2 ${
                          isSelected
                            ? "bg-default-100 border border-default-200 shadow-sm"
                            : "hover:bg-default-50 border border-transparent"
                        }`}
                      >
                        <div className={`flex-shrink-0 ${cfg.color}`}>
                          {cfg.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium truncate ${
                            isSelected ? "text-default-700" : "text-default-600"
                          }`}>
                            {run.runNumber
                              ? `Run #${run.runNumber}`
                              : run.id.slice(0, 8)}
                          </p>
                          <p className="text-[10px] text-default-400">
                            {run.startedAt
                              ? run.startedAt.toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : run.createdAt.toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                })}
                          </p>
                        </div>
                        <span className={`text-[10px] font-medium ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>

          {/* ── Steps Display ──────────────────────────────────── */}
          <div className="lg:col-span-3">
            {currentJob ? (
              <div>
                {/* Job Header */}
                <div className="bg-background rounded-2xl border border-default-100 p-6 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-foreground">
                        {currentJob.name}
                      </h2>
                      <p className="text-sm text-default-400">
                        {currentJob.steps.length} step
                        {currentJob.steps.length !== 1 ? "s" : ""}
                        {currentJob.agent
                          ? ` • Agent: ${currentJob.agent}`
                          : ""}
                        {hasTestRunResult && testRun?.status === "running"
                          ? ` • ${getStatusConfig("running").label}`
                          : currentJobRunEffective?.status
                            ? ` • ${getStatusConfig(currentJobRunEffective.status).label}`
                            : ""}
                      </p>
                    </div>
                    <BFlowStatusBadge
                      status={
                        hasTestRunResult
                          ? testRun?.status === "running"
                            ? "running"
                            : currentJobRunEffective?.status
                          : currentJobRun?.status
                      }
                    />
                  </div>

                  {currentJobRunEffective?.status === "running" && (
                    <div className="w-full bg-default-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-success to-teal-500 h-full rounded-full transition-all duration-500 animate-pulse"
                        style={{
                          width: `${
                            currentStepRunsEffective.length > 0
                              ? (currentStepRunsEffective.filter(
                                  (s) =>
                                    s.status === "succeeded" ||
                                    s.status === "failed" ||
                                    s.status === "skipped",
                                ).length /
                                  currentJob.steps.length) *
                                100
                              : 5
                          }%`,
                        }}
                      />
                    </div>
                  )}
                </div>

                {currentJob.needs && (
                  <div className="bg-warning-50 border border-warning-200 rounded-xl p-3 mb-4 flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-warning" />
                    <span className="text-warning-700">
                      Depends on:{" "}
                      {Array.isArray(currentJob.needs)
                        ? currentJob.needs.join(", ")
                        : currentJob.needs}
                    </span>
                  </div>
                )}

                <div className="space-y-6 relative">
                  <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-default-100" />

                  {currentJob.steps.map((step, stepIdx) => {
                    // Use step.id as primary identifier, falling back to step.name
                    // for templates without explicit IDs in YAML
                    const stepKey = step.id || step.name;
                    const stepRun = hasTestRunResult
                      ? currentStepRunsEffective.find(
                          (sr) => sr.stepId === stepKey,
                        )
                      : currentStepRuns.find((sr) => sr.stepId === stepKey);
                    return (
                      <BFlowStepNode
                        key={step.id ?? `step-${stepIdx}-${step.name}`}
                        step={step}
                        stepRun={stepRun}
                        onView={(s, sr) =>
                          setViewStep({ step: s, stepRun: sr })
                        }
                        onViewOutput={(s, sr) =>
                          setViewOutput({ step: s, stepRun: sr })
                        }
                        onViewComputedInputs={(s, sr) =>
                          setViewComputedInputs({ step: s, stepRun: sr })
                        }
                      />
                    );
                  })}

                  {currentStepRuns.length === 0 &&
                    currentStepRunsEffective.length === 0 &&
                    !activeRun &&
                    !hasTestRunResult && (
                      <div className="text-center py-12">
                        <Beaker className="w-12 h-12 text-default-200 mx-auto mb-4" />
                        <p className="text-default-400 text-sm">
                          Click &ldquo;Test Run&rdquo; or &ldquo;Run
                          Pipeline&rdquo; to start execution
                        </p>
                      </div>
                    )}
                </div>

                {currentJob.prompt && (
                  <div className="mt-6 bg-default-50 rounded-xl p-4">
                    <h4 className="text-xs font-semibold text-default-500 uppercase tracking-wider mb-2">
                      Job Prompt
                    </h4>
                    <p className="text-sm text-default-600 whitespace-pre-wrap">
                      {currentJob.prompt}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-background rounded-2xl border border-default-100 p-12 text-center">
                <Clock className="w-12 h-12 text-default-200 mx-auto mb-4" />
                <p className="text-default-400">No jobs defined in template</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Step Details Modal ─────────────────────────────────── */}
      {viewStep && (
        <BFlowStepDetailsModal
          open={!!viewStep}
          onClose={() => setViewStep(null)}
          step={viewStep.step}
          stepRun={viewStep.stepRun}
          pipelineVariables={resolvedVariables}
        />
      )}

      {/* ── Output Modal (react-markdown) ──────────────────────── */}
      {viewOutput && (
        <BFlowOutputModal
          open={!!viewOutput}
          onClose={() => setViewOutput(null)}
          step={viewOutput.step}
          stepRun={viewOutput.stepRun}
        />
      )}

      {/* ── Computed Inputs Modal ──────────────────────────────── */}
      {viewComputedInputs && (
        <BFlowComputedInputsModal
          open={!!viewComputedInputs}
          onClose={() => setViewComputedInputs(null)}
          step={viewComputedInputs.step}
          stepRun={viewComputedInputs.stepRun}
        />
      )}

      {/* ── Raw YAML Schema Modal (Task 1) ─────────────────────── */}
      {viewRawYaml && template?.templateYaml && (
        <BFlowRawYamlModal
          open={viewRawYaml}
          onClose={() => setViewRawYaml(false)}
          yaml={template.templateYaml}
          label={template?.name ? `${template.name} — ${template.slug}` : undefined}
        />
      )}

      {/* ── Report View Modal (Task 2) ─────────────────────────── */}
      {viewReport && (
        <BFlowReportViewModal
          open={!!viewReport}
          onClose={() => setViewReport(null)}
          report={viewReport.report}
          content={resolvedReportContent}
          jobs={effectiveSnapshotJobs}
        />
      )}

      {/* ── HTML Preview Modal ─────────────────────────────────── */}
      {viewHtmlPreview && htmlExportInput && (
        <BFlowHtmlPreviewModal
          open={viewHtmlPreview}
          onClose={() => setViewHtmlPreview(false)}
          input={htmlExportInput}
          filename={`${pipeline?.slug ?? "pipeline"}-report.html`}
          options={{
            includeResolvedPrompts: false,
            includeResolvedInputs: false,
            includeDescription: true,
          }}
        />
      )}

      {/* ── Report Preview Modal (Full Report / YAML Config) ──── */}
      {reportPreview && (
        <BFlowReportPreviewModal
          open={!!reportPreview}
          onClose={() => setReportPreview(null)}
          content={reportPreview.content}
          title={reportPreview.title}
          downloadFilename={reportPreview.filename}
        />
      )}

      {/* ── Consolidated Reports HTML Preview ──────────────────── */}
      {viewReportsHtml && resolvedReportItems.length > 0 && (
        <BFlowReportsHtmlPreview
          open={viewReportsHtml}
          onClose={() => setViewReportsHtml(false)}
          pipelineName={effectiveSnapshotPipelineName}
          reports={resolvedReportItems}
          filename={`${pipeline?.slug ?? "pipeline"}-reports.html`}
        />
      )}
    </div>
  );
}
