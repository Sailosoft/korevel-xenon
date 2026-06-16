"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { getBFlowDB } from "@/src/modules/bunny-flow/src/database/BFlowDatabase";
import {
  LayoutDashboard,
  Workflow,
  Container,
  Users,
  Play,
  FileBarChart,
  Settings,
  ArrowLeft,
  GitBranch,
} from "lucide-react";

export const dynamic = "force-dynamic";

const THEME = {
  textPrimary: "text-[#ff2d20]",
  border: "border-slate-100",
};

// ─── Tab configuration ────────────────────────────────────────────

interface FlowTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
}

function getFlowTabs(flowId: string): FlowTab[] {
  return [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="w-4 h-4" />,
      href: `/modules/bunny-flow/${flowId}?tab=dashboard`,
    },
    {
      id: "workspaces",
      label: "Workspaces",
      icon: <Workflow className="w-4 h-4" />,
      href: `/modules/bunny-flow/${flowId}?tab=workspaces`,
    },
    {
      id: "pipelines",
      label: "Pipelines",
      icon: <Container className="w-4 h-4" />,
      href: `/modules/bunny-flow/${flowId}?tab=pipelines`,
    },
    {
      id: "agent-pools",
      label: "Agent Pools",
      icon: <Users className="w-4 h-4" />,
      href: `/modules/bunny-flow/${flowId}?tab=agent-pools`,
    },
    {
      id: "runs",
      label: "Runs",
      icon: <Play className="w-4 h-4" />,
      href: `/modules/bunny-flow/${flowId}?tab=runs`,
    },
    {
      id: "reports",
      label: "Reports",
      icon: <FileBarChart className="w-4 h-4" />,
      href: `/modules/bunny-flow/${flowId}?tab=reports`,
    },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="w-4 h-4" />,
      href: `/modules/bunny-flow/${flowId}?tab=settings`,
    },
  ];
}

// ─── Props ────────────────────────────────────────────────────────

interface FlowDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}

// ─── Page ─────────────────────────────────────────────────────────

export default function BFlowDetailPage({
  params,
  searchParams,
}: FlowDetailPageProps) {
  const { id } = use(params);
  const resolvedSearch = use(
    searchParams ?? Promise.resolve({} as Record<string, string | undefined>),
  );
  const activeTab = resolvedSearch.tab ?? "dashboard";

  const db = getBFlowDB();

  // Fetch the flow definition
  const definition = useLiveQuery(() => db?.definitions.get(id), [id, db]);

  // Fetch related entities
  const workflows =
    useLiveQuery(
      () =>
        db
          ? db.workflowTemplates.filter((w) => w.definitionId === id).toArray()
          : Promise.resolve([] as any[]),
      [id, db],
    ) ?? [];

  const pipelines =
    useLiveQuery(
      () =>
        db
          ? db.pipelines.filter((p) => p.flowId === id).toArray()
          : Promise.resolve([] as any[]),
      [id, db],
    ) ?? [];

  const activePipelines = pipelines.filter((p: any) => p.status === "running");
  const completedPipelines = pipelines.filter(
    (p: any) => p.status === "completed",
  );

  const tabs = getFlowTabs(id);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── Back navigation ── */}
      <Link
        href="/modules/bunny-flow"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#ff2d20] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Definitions
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

      {/* ── Tabs ── */}
      <div className="flex flex-wrap gap-1 border-b border-slate-100 pb-0">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                isActive
                  ? `${THEME.textPrimary} border-[#ff2d20] bg-red-50/30`
                  : "text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-200"
              }`}
            >
              {tab.icon}
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* ── Tab Content ── */}
      <div className="min-h-[400px]">
        {activeTab === "dashboard" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6">
              <h3 className="text-sm font-semibold text-slate-500 mb-2">
                Workflows
              </h3>
              <p className="text-3xl font-bold text-slate-800">
                {workflows.length}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6">
              <h3 className="text-sm font-semibold text-slate-500 mb-2">
                Total Pipelines
              </h3>
              <p className="text-3xl font-bold text-slate-800">
                {pipelines.length}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6">
              <h3 className="text-sm font-semibold text-slate-500 mb-2">
                Active Runs
              </h3>
              <p className="text-3xl font-bold text-slate-800">
                {activePipelines.length}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-5 col-span-full">
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
          </div>
        )}

        {activeTab === "workspaces" && (
          <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6">
            <h3 className="text-base font-bold text-slate-800 mb-4">
              Workspaces
            </h3>
            {workflows.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {workflows.map((w: any) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        {w.name}
                      </p>
                      <p className="text-xs text-slate-400">{w.slug}</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">
                      {w.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No workspaces yet.</p>
            )}
          </div>
        )}

        {activeTab === "pipelines" && (
          <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6">
            <h3 className="text-base font-bold text-slate-800 mb-4">
              Pipelines
            </h3>
            {pipelines.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {pipelines.map((p: any) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        {p.name}
                      </p>
                      <p className="text-xs text-slate-400">v{p.version}</p>
                    </div>
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
        )}

        {activeTab === "agent-pools" && (
          <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6">
            <h3 className="text-base font-bold text-slate-800 mb-4">
              Agent Pools
            </h3>
            <p className="text-sm text-slate-400">
              Agent pools allow you to group agents that can be assigned to
              workflows. Configure agent pools via the workflow template YAML.
            </p>
          </div>
        )}

        {activeTab === "runs" && (
          <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6">
            <h3 className="text-base font-bold text-slate-800 mb-4">
              Pipeline Runs
            </h3>
            <p className="text-sm text-slate-400">
              View the execution history and status of pipeline runs.
            </p>
          </div>
        )}

        {activeTab === "reports" && (
          <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6">
            <h3 className="text-base font-bold text-slate-800 mb-4">Reports</h3>
            <p className="text-sm text-slate-400">
              Generate and export reports for pipeline executions.
            </p>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6">
            <h3 className="text-base font-bold text-slate-800 mb-4">
              Flow Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Flow Code
                </label>
                <p className="text-sm text-slate-400">{definition?.code}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Slug
                </label>
                <p className="text-sm text-slate-400">{definition?.slug}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Version
                </label>
                <p className="text-sm text-slate-400">
                  {definition?.version ?? "—"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
