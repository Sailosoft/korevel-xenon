"use client";

import { use, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { bflowDB } from "@/src/modules/bunny-flow/src/database/BFlowDatabase";
import {
  GitBranch,
  Workflow,
  Container,
  FileBarChart,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

// ─── Props ────────────────────────────────────────────────────────

interface FlowDashboardPageProps {
  params: Promise<{ id: string }>;
}

// ─── Page ──────────────────────────────────────────────────────────

export default function BFlowDashboardPage({ params }: FlowDashboardPageProps) {
  const { id } = use(params);

  // ── Track query completion separately from data ──
  // useLiveQuery returns undefined for BOTH "loading" and "not found".
  // Without this flag the page would spin forever when get(id) resolves
  // to undefined (i.e. the record doesn't exist).
  const [loaded, setLoaded] = useState(false);

  // Fetch the flow definition and related counts
  const definition = useLiveQuery(
    () =>
      bflowDB.definitions.get(id).then((result) => {
        setLoaded(true);
        return result;
      }),
    [id],
  );

  const workflows =
    useLiveQuery(
      () =>
        bflowDB.workflowTemplates
          .filter((w) => w.definitionId === id)
          .toArray(),
      [id],
    ) ?? [];

  const pipelines =
    useLiveQuery(
      () => bflowDB.pipelines.filter((p) => p.flowId === id).toArray(),
      [id],
    ) ?? [];

  const reports =
    useLiveQuery(
      () => bflowDB.reportTemplates.filter((r) => r.flowId === id).toArray(),
      [id],
    ) ?? [];

  if (!loaded) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-[#ff2d20] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activePipelines = pipelines.filter((p: any) => p.status === "running");

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── Back navigation ── */}
      <Link
        href="/modules/bunny-flow"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#ff2d20] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Flows
      </Link>

      {/* ── Flow Header ── */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-100">
          <GitBranch className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {definition?.name ?? "Loading..."}
          </h1>
          <p className="text-sm text-slate-400">
            {definition?.code ?? ""}
            {definition?.description ? ` — ${definition.description}` : ""}
          </p>
        </div>
        {definition?.status && (
          <span
            className={`ml-auto px-3 py-1 rounded-full text-xs font-semibold ${
              definition.status === "published"
                ? "bg-emerald-50 text-emerald-600"
                : definition.status === "archived"
                  ? "bg-slate-100 text-slate-500"
                  : "bg-amber-50 text-amber-600"
            }`}
          >
            {definition.status}
          </span>
        )}
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6">
          <div className="flex items-center gap-2 mb-2">
            <Workflow className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-slate-500">Workflows</h3>
          </div>
          <p className="text-3xl font-bold text-slate-800">
            {workflows.length}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6">
          <div className="flex items-center gap-2 mb-2">
            <Container className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-slate-500">
              Total Pipelines
            </h3>
          </div>
          <p className="text-3xl font-bold text-slate-800">
            {pipelines.length}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6">
          <div className="flex items-center gap-2 mb-2">
            <FileBarChart className="w-4 h-4 text-rose-500" />
            <h3 className="text-sm font-semibold text-slate-500">Reports</h3>
          </div>
          <p className="text-3xl font-bold text-slate-800">{reports.length}</p>
        </div>
      </div>

      {/* ── Recent Pipelines ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6">
        <h3 className="text-sm font-semibold text-slate-500 mb-4">
          Recent Pipelines
        </h3>
        {pipelines.length > 0 ? (
          <div className="divide-y divide-slate-50">
            {pipelines.slice(0, 5).map((p: any) => (
              <div
                key={p.id}
                className="flex items-center justify-between py-2"
              >
                <span className="text-sm font-medium text-slate-700">
                  {p.name}
                </span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    p.status === "completed"
                      ? "bg-emerald-50 text-emerald-600"
                      : p.status === "running"
                        ? "bg-amber-50 text-amber-600"
                        : p.status === "failed"
                          ? "bg-red-50 text-red-600"
                          : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No pipelines yet.</p>
        )}
      </div>

      {/* ── Active Runs Summary ── */}
      {activePipelines.length > 0 && (
        <div className="bg-amber-50 rounded-2xl border border-amber-100 p-5 md:p-6">
          <h3 className="text-sm font-semibold text-amber-700 mb-2">
            Active Runs
          </h3>
          <p className="text-3xl font-bold text-amber-600">
            {activePipelines.length}
          </p>
          <p className="text-sm text-amber-500 mt-1">
            {activePipelines.length} pipeline
            {activePipelines.length !== 1 ? "s are" : " is"} currently running.
          </p>
        </div>
      )}
    </div>
  );
}
