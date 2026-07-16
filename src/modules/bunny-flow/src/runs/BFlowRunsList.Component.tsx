"use client";

/**
 * BFlowRunsList — Display a list of pipeline runs with pipeline name,
 * workflow name, status, and timestamps.
 *
 * Supports optional filtering by flowId (scoped to a flow) or pipelineId.
 */

import { useRouter } from "next/navigation";
import {
  Play,
  Clock,
  ExternalLink,
  ListRestart,
} from "lucide-react";
import { useBFlowRunsList } from "./BFlowRunsList.Hooks";
import type { BFlowRunsListProps } from "./BFlowRunsList.Types";
import { BFlowStatusBadge, getStatusConfig } from "../run/BFlowStatusBadge";
import { useBFlowFlow } from "../context/BFlowFlowContext";

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

// ─── Main Component ────────────────────────────────────────────────

/**
 * Renders a list of pipeline runs with enriched pipeline and workflow names.
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
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-default-100">
              {runs.map((run) => {
                const cfg = getStatusConfig(run.status);
                return (
                  <tr
                    key={run.id}
                    onClick={() =>
                      router.push(
                        `/modules/bunny-flow/flow/${run.flowId}/pipeline/${run.pipelineId}/run`,
                      )
                    }
                    className="group cursor-pointer transition-colors hover:bg-default-50/80"
                  >
                    {/* Pipeline */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.bg}`}
                        >
                          <Play className={`w-4 h-4 ${cfg.color}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                            {run.pipelineName}
                          </p>
                          <p className="text-xs text-default-400">
                            {run.flowId.slice(0, 8)}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Workflow */}
                    <td className="px-5 py-4">
                      <span className="text-sm text-default-600">
                        {run.workflowName}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <BFlowStatusBadge status={run.status} />
                    </td>

                    {/* Started */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-default-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {run.startedAt
                            ? formatDate(run.startedAt)
                            : formatDate(run.createdAt)}
                        </span>
                      </div>
                    </td>

                    {/* Duration */}
                    <td className="px-5 py-4">
                      <span className="text-sm text-default-500">
                        {formatDuration(run.startedAt, run.completedAt)}
                      </span>
                    </td>

                    {/* Run # */}
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-1 text-sm text-default-400 group-hover:text-primary transition-colors">
                        <span>
                          {run.runNumber
                            ? `#${run.runNumber}`
                            : `#${run.id.slice(0, 6)}`}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
