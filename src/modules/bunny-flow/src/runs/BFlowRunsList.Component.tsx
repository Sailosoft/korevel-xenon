"use client";

/**
 * BFlowRunsList — Display a list of pipeline runs with pipeline name,
 * workflow name, status, timestamps, delete capability, and pagination.
 *
 * Clicking a row expands it to reveal the workflow snapshot details
 * (jobs, steps, reports configuration) captured at run time.
 *
 * Supports optional filtering by flowId (scoped to a flow) or pipelineId.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Clock,
  ExternalLink,
  ListRestart,
  ChevronDown,
  ChevronRight,
  FileBarChart,
  Beaker,
  CheckCircle2,
  XCircle,
  AlertCircle,
  SkipForward,
  Trash2,
  ChevronLeft,
  ChevronsLeft,
  ChevronRight as ChevronRightIcon,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@heroui/react";
import { useBFlowRunsList } from "./BFlowRunsList.Hooks";
import type { BFlowRunsListProps } from "./BFlowRunsList.Types";
import { BFlowStatusBadge, getStatusConfig } from "../run/BFlowStatusBadge";
import { useBFlowFlow } from "../context/BFlowFlowContext";
import { bflowRunDB } from "../run/BFlowRunDB";
import type { BFlowPipelineRunEntity, BFlowRunSnapshot } from "../run/BFlowRun.Types";

// ─── Constants ──────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;

// ─── Helpers ───────────────────────────────────────────────────────

/**
 * Format a duration between two dates as a human-readable string.
 * Falls back to "--" if either date is missing.
 */
function formatDuration(startedAt?: Date, completedAt?: Date): string {
  if (!startedAt) return "\u2014";
  const end = completedAt ?? new Date();
  const ms = end.getTime() - startedAt.getTime();
  if (ms < 1_000) return `${ms}ms`;
  if (ms < 60_000) return `${Math.floor(ms / 1_000)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1_000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Format a date to a readable string with relative fallback.
 */
function formatDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffDays === 0) {
    return `Today at ${date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }
  if (diffDays === 1) {
    return `Yesterday at ${date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Map step status to icon component */
function StepStatusIcon({ status }: { status?: string }) {
  switch (status) {
    case "succeeded":
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
    case "failed":
      return <XCircle className="w-3.5 h-3.5 text-red-500" />;
    case "running":
      return <Beaker className="w-3.5 h-3.5 text-blue-500 animate-pulse" />;
    case "skipped":
      return <SkipForward className="w-3.5 h-3.5 text-slate-400" />;
    case "pending":
      return <AlertCircle className="w-3.5 h-3.5 text-amber-500" />;
    default:
      return <AlertCircle className="w-3.5 h-3.5 text-slate-400" />;
  }
}

// ─── Loading Skeleton ──────────────────────────────────────────────

function RunsListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="bg-background rounded-2xl border border-default-100 p-5 animate-pulse"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-default-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 bg-default-200 rounded" />
              <div className="h-3 w-32 bg-default-100 rounded" />
            </div>
            <div className="h-6 w-20 bg-default-200 rounded-full" />
            <div className="h-3 w-24 bg-default-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────

function RunsListEmptyState() {
  return (
    <div className="bg-background rounded-2xl border border-default-100 p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto mb-4">
        <Play className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">
        No Pipeline Runs Yet
      </h2>
      <p className="text-sm text-default-400 max-w-md mx-auto">
        Pipeline runs will appear here once you execute a pipeline.
        Navigate to a pipeline and click &ldquo;Run Pipeline&rdquo; to
        get started.
      </p>
    </div>
  );
}

// ─── Snapshot Details Panel ────────────────────────────────────────

interface SnapshotDetailsProps {
  runId: string;
}

function SnapshotDetailsPanel({ runId }: SnapshotDetailsProps) {
  const [runData, setRunData] = useState<{
    pipelineRun: BFlowPipelineRunEntity | undefined;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    bflowRunDB.pipelineRuns
      .get(runId)
      .then((result) => {
        const pipelineRun = result.isSuccess ? result.value : undefined;
        if (!cancelled) setRunData(pipelineRun ? { pipelineRun } : null);
      })
      .catch(() => {
        if (!cancelled) setRunData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [runId]);

  if (loading) {
    return (
      <div className="py-6 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const snapshot = runData?.pipelineRun?.snapshot;
  if (!snapshot || (!snapshot.jobs?.length && !snapshot.reports?.length)) {
    return (
      <div className="py-6 text-center text-sm text-default-400">
        <FileBarChart className="w-8 h-8 mx-auto mb-2 text-default-200" />
        No snapshot data available for this run.
      </div>
    );
  }

  const totalSteps = snapshot.jobs?.reduce((acc, j) => acc + (j.steps?.length ?? 0), 0) ?? 0;

  return (
    <div className="py-4 space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-default-50 rounded-xl p-3">
          <p className="text-[10px] text-default-400 uppercase tracking-wider">Jobs</p>
          <p className="text-lg font-bold text-foreground">{snapshot.jobs?.length ?? 0}</p>
        </div>
        <div className="bg-default-50 rounded-xl p-3">
          <p className="text-[10px] text-default-400 uppercase tracking-wider">Steps</p>
          <p className="text-lg font-bold text-foreground">{totalSteps}</p>
        </div>
        <div className="bg-default-50 rounded-xl p-3">
          <p className="text-[10px] text-default-400 uppercase tracking-wider">Reports Config</p>
          <p className="text-lg font-bold text-foreground">{snapshot.reports?.length ?? 0}</p>
        </div>
        <div className="bg-default-50 rounded-xl p-3">
          <p className="text-[10px] text-default-400 uppercase tracking-wider">Template</p>
          <p className="text-sm font-medium text-foreground truncate">
            {snapshot.templateName ?? "—"}
          </p>
        </div>
      </div>

      {/* Jobs & Steps Structure */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-default-500 uppercase tracking-wider">
          Workflow Structure (Snapshot)
        </h4>
        <div className="space-y-1.5">
          {snapshot.jobs?.map((job, jIdx) => (
            <div key={job.id ?? `job-${jIdx}`}>
              <div className="flex items-center gap-2 py-1.5 px-3 bg-background rounded-lg border border-default-100">
                <div className="w-5 h-5 rounded bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <Play className="w-3 h-3 text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-foreground">{job.name}</span>
                <span className="text-xs text-default-400 ml-auto">
                  {job.steps?.length ?? 0} step{(job.steps?.length ?? 0) !== 1 ? "s" : ""}
                </span>
                <ChevronRight className="w-3 h-3 text-default-300" />
              </div>
              {/* Steps in this job */}
              <div className="ml-6 mt-1 space-y-0.5">
                {job.steps?.map((step, sIdx) => (
                  <div
                    key={step.id ?? `step-${jIdx}-${sIdx}`}
                    className="flex items-center gap-2 py-1 px-3 rounded-lg text-xs"
                  >
                    <span className="w-4 h-4 rounded-full bg-default-100 flex items-center justify-center text-[10px] text-default-500 font-medium">
                      {sIdx + 1}
                    </span>
                    <span className="text-default-600">{step.name}</span>
                    {step.outputType && (
                      <span className="ml-auto inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-default-100 text-default-500">
                        {step.outputType}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reports Config */}
      {snapshot.reports && snapshot.reports.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-default-500 uppercase tracking-wider">
            Reports Configuration
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {snapshot.reports.map((r, rIdx) => (
              <div
                key={r.name ?? `report-${rIdx}`}
                className="flex items-center gap-2 py-1.5 px-3 bg-background rounded-lg border border-default-100"
              >
                <FileBarChart className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span className="text-xs font-medium text-foreground">
                  {r.label ?? r.name}
                </span>
                <code className="text-[10px] text-default-400 ml-auto truncate max-w-[120px]">
                  {r.source}
                </code>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Delete Confirmation Modal ─────────────────────────────────────

interface DeleteConfirmModalProps {
  open: boolean;
  runLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}

function DeleteConfirmModal({ open, runLabel, onConfirm, onCancel, deleting }: DeleteConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Delete Run</h3>
            <p className="text-xs text-default-400 mt-0.5">
              This action cannot be undone.
            </p>
          </div>
        </div>
        <p className="text-sm text-default-600 mb-6">
          Are you sure you want to delete run <strong>{runLabel}</strong> and all
          associated job and step data?
        </p>
        <div className="flex items-center justify-end gap-2">
          <Button
            onPress={onCancel}
            variant="ghost"
            size="sm"
            className="text-default-500"
            isDisabled={deleting}
          >
            Cancel
          </Button>
          <Button
            onPress={onConfirm}
            variant="primary"
            size="sm"
            className="bg-red-500 text-white hover:bg-red-600 border-red-500"
            isDisabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Pagination Controls ──────────────────────────────────────────

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

function PaginationControls({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-default-100 bg-default-50/30">
      <div className="flex items-center gap-3 text-xs text-default-500">
        <span>
          {startItem}&ndash;{endItem} of {totalItems}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-default-400">Per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-background border border-default-200 rounded-md px-2 py-1 text-xs text-default-600 focus:outline-none focus:border-primary"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-md text-default-400 hover:bg-default-100 disabled:opacity-30 disabled:cursor-not-allowed"
          title="First page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-md text-default-400 hover:bg-default-100 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="px-3 py-1 text-xs font-medium text-default-600">
          Page {currentPage} of {totalPages}
        </span>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-md text-default-400 hover:bg-default-100 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Next page"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-md text-default-400 hover:bg-default-100 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────

/**
 * Renders a list of pipeline runs with enriched pipeline and workflow names.
 * Clicking a row expands it to show the workflow snapshot details.
 * Each row has a delete action. The list is paginated client-side.
 *
 * When rendered inside a `BFlowFlowProvider` (i.e. within
 * `/modules/bunny-flow/flow/[id]/...`), it automatically reads the
 * `flowId` from context. You can also pass an explicit `flowId` or
 * `pipelineId` prop to override.
 */
export default function BFlowRunsList(props: BFlowRunsListProps) {
  const router = useRouter();

  // If inside a flow context, use the contextual flowId as default
  let flowId = props.flowId;
  try {
    const flowCtx = useBFlowFlow();
    if (!flowId) {
      flowId = flowCtx.flowId;
    }
  } catch {
    // Not inside a BFlowFlowProvider — that's fine, use props only
  }

  const { runs, isLoading, totalCount } = useBFlowRunsList({
    flowId,
    pipelineId: props.pipelineId,
  });

  // ── Pagination state ──────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [flowId, props.pipelineId]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Clamp current page when total pages changes
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedRuns = useMemo(
    () => runs.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [runs, currentPage, pageSize],
  );

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  }, []);

  // ── Expanded run state ─────────────────────────────────────────
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  const toggleExpand = useCallback((runId: string) => {
    setExpandedRunId((prev) => (prev === runId ? null : runId));
  }, []);

  // ── Delete state ──────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await bflowRunDB.pipelineRuns.mutation.delete(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      console.error("[BFlowRunsList] Failed to delete run:", err);
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget]);

  // ── Render States ─────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
            <ListRestart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Pipeline Runs
            </h1>
            <p className="text-sm text-default-400">Loading runs...</p>
          </div>
        </div>
        <RunsListSkeleton />
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
            <ListRestart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Pipeline Runs
            </h1>
            <p className="text-sm text-default-400">
              Execution history
            </p>
          </div>
        </div>
        <RunsListEmptyState />
      </div>
    );
  }

  // ── Runs List ─────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
          <ListRestart className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Pipeline Runs
          </h1>
          <p className="text-sm text-default-400">
            {totalCount} run{totalCount !== 1 ? "s" : ""} found
          </p>
        </div>
      </div>

      {/* ── Stats Bar ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(
          [
            { label: "Total Runs", value: totalCount, color: "text-default-700" },
            {
              label: "Succeeded",
              value: runs.filter((r) => r.status === "succeeded").length,
              color: "text-success",
            },
            {
              label: "Failed",
              value: runs.filter((r) => r.status === "failed").length,
              color: "text-danger",
            },
            {
              label: "Running",
              value: runs.filter((r) => r.status === "running").length,
              color: "text-primary",
            },
          ] as const).map((stat) => (
            <div
              key={stat.label}
              className="bg-background rounded-2xl border border-default-100 p-4"
            >
              <p className="text-xs text-default-400 uppercase tracking-wider mb-1">
                {stat.label}
              </p>
              <p className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </p>
            </div>
          ))}
      </div>

      {/* ── Runs Table ─────────────────────────────────────────── */}
      <div className="bg-background rounded-2xl border border-default-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Table Header */}
            <thead>
              <tr className="border-b border-default-100 bg-default-50/50">
                <th className="w-8 px-2 py-3" />
                <th className="text-left text-xs font-semibold text-default-500 uppercase tracking-wider px-5 py-3">
                  Pipeline
                </th>
                <th className="text-left text-xs font-semibold text-default-500 uppercase tracking-wider px-5 py-3">
                  Workflow
                </th>
                <th className="text-left text-xs font-semibold text-default-500 uppercase tracking-wider px-5 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-semibold text-default-500 uppercase tracking-wider px-5 py-3">
                  Started
                </th>
                <th className="text-left text-xs font-semibold text-default-500 uppercase tracking-wider px-5 py-3">
                  Duration
                </th>
                <th className="text-right text-xs font-semibold text-default-500 uppercase tracking-wider px-5 py-3">
                  Run #
                </th>
                <th className="w-16 px-2 py-3 text-right">
                  <span className="text-xs font-semibold text-default-500 uppercase tracking-wider">
                    Actions
                  </span>
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-default-100">
              {paginatedRuns.map((run) => {
                const cfg = getStatusConfig(run.status);
                const isExpanded = expandedRunId === run.id;
                return (
                  <tr key={run.id} className="group">
                    <td colSpan={8} className="p-0">
                      {/* Main Row */}
                      <div
                        onClick={() => toggleExpand(run.id)}
                        className={`flex items-center w-full cursor-pointer transition-colors hover:bg-default-50/80 ${
                          isExpanded ? "bg-default-50/50" : ""
                        }`}
                      >
                        {/* Expand/Collapse icon */}
                        <div className="w-8 px-2 py-4 flex-shrink-0">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-default-300" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-default-300" />
                          )}
                        </div>

                        {/* Pipeline */}
                        <div className="flex-1 flex items-center gap-3 px-5 py-4 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}
                          >
                            <Play className={`w-4 h-4 ${cfg.color}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {run.pipelineName}
                            </p>
                            <p className="text-xs text-default-400 truncate">
                              {run.flowId.slice(0, 8)}
                            </p>
                          </div>
                        </div>

                        {/* Workflow */}
                        <div className="px-5 py-4 w-40 flex-shrink-0 hidden md:block">
                          <span className="text-sm text-default-600 truncate block">
                            {run.workflowName}
                          </span>
                        </div>

                        {/* Status */}
                        <div className="px-5 py-4 w-28 flex-shrink-0">
                          <BFlowStatusBadge status={run.status} />
                        </div>

                        {/* Started */}
                        <div className="px-5 py-4 w-44 flex-shrink-0 hidden lg:block">
                          <div className="flex items-center gap-1.5 text-sm text-default-500">
                            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">
                              {run.startedAt
                                ? formatDate(run.startedAt)
                                : formatDate(run.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Duration */}
                        <div className="px-5 py-4 w-24 flex-shrink-0">
                          <span className="text-sm text-default-500">
                            {formatDuration(run.startedAt, run.completedAt)}
                          </span>
                        </div>

                        {/* Run # */}
                        <div className="px-5 py-4 w-20 flex-shrink-0 text-right">
                          <div className="inline-flex items-center gap-1 text-sm text-default-400">
                            <span>
                              {run.runNumber
                                ? `#${run.runNumber}`
                                : `#${run.id.slice(0, 6)}`}
                            </span>
                          </div>
                        </div>

                        {/* Actions: Delete */}
                        <div
                          className="px-2 py-4 flex-shrink-0 flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                          role="toolbar"
                        >
                          {/* View button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="min-w-0 px-2 text-default-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            onPress={() =>
                              router.push(
                                `/modules/bunny-flow/flow/${run.flowId}/pipeline/${run.pipelineId}/run`,
                              )
                            }
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>

                          {/* Delete button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="min-w-0 px-2 text-red-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                            onPress={() =>
                              setDeleteTarget({
                                id: run.id,
                                label: `#${run.runNumber ?? run.id.slice(0, 6)}`,
                              })
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Expanded Snapshot Detail */}
                      {isExpanded && (
                        <div className="border-t border-default-100 bg-default-50/30">
                          <div className="px-8 py-2">
                            <SnapshotDetailsPanel runId={run.id} />
                          </div>
                          <div className="px-8 py-3 border-t border-default-100 flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onPress={() =>
                                router.push(
                                  `/modules/bunny-flow/flow/${run.flowId}/pipeline/${run.pipelineId}/run`,
                                )
                              }
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              View Full Run Details
                            </Button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ──────────────────────────────────────── */}
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalCount}
          onPageChange={setCurrentPage}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>

      {/* ── Delete Confirmation Modal ──────────────────────────── */}
      <DeleteConfirmModal
        open={!!deleteTarget}
        runLabel={deleteTarget?.label ?? ""}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        deleting={deleting}
      />
    </div>
  );
}
