"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import {
  GitBranch,
  Workflow,
  Container,
  FileBarChart,
  Users,
  Play,
  TrendingUp,
  Plus,
  ArrowRight,
  Activity,
  Layers,
  Sparkles,
  Rabbit,
} from "lucide-react";
import { bflowDB } from "@/src/modules/bunny-flow/src/database/BFlowDatabase";

// ─── Theme — matches the layout's Laravel crimson ───
const THEME = {
  gradient: "from-[#ff2d20] to-[#f43f5e]",
  shadow: "shadow-red-100",
  textPrimary: "text-[#ff2d20]",
  btnPrimary: "bg-[#ff2d20] text-white hover:bg-[#e0241b] transition-colors",
  btnSecondary: "text-[#ff2d20] bg-red-50 hover:bg-red-100 transition-colors",
  border: "border-slate-100",
};

// ─── Helpers ───
function pluralize(count: number, singular: string, plural?: string) {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

// ─── Stat Card ───
interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  href: string;
  accent: string;
  trend?: string;
}

function StatCard({ label, value, icon, href, accent, trend }: StatCardProps) {
  return (
    <Link
      href={href}
      className={`group relative bg-white rounded-2xl border ${THEME.border} p-5 md:p-6 
        hover:shadow-lg hover:border-red-100 transition-all duration-200 
        hover:-translate-y-0.5 cursor-pointer flex flex-col gap-3`}
    >
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center ${accent}`}
      >
        {icon}
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">
          {value}
        </span>
        {trend && (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            <TrendingUp className="w-3 h-3" />
            {trend}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <ArrowRight
          className={`w-4 h-4 text-slate-300 group-hover:translate-x-0.5 group-hover:${THEME.textPrimary} transition-all`}
        />
      </div>
    </Link>
  );
}

// ─── Recent Definition Row ───
function RecentDefinitionRow({
  id,
  name,
  status,
}: {
  id: string;
  name: string;
  status?: string;
}) {
  return (
    <Link
      href={`/modules/bunny-flow/${id}`}
      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors group"
    >
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
        <GitBranch className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-[#ff2d20] transition-colors">
          {name}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">{status ?? "draft"}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#ff2d20] transition-colors flex-shrink-0" />
    </Link>
  );
}

// ─── Quick Action Tile ───
interface QuickActionProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  accent: string;
}

function QuickAction({
  label,
  description,
  icon,
  href,
  accent,
}: QuickActionProps) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-4 p-4 rounded-xl border ${THEME.border} bg-white 
        hover:shadow-md hover:border-red-100 transition-all duration-200 cursor-pointer`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 group-hover:text-[#ff2d20] transition-colors">
          {label}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
      </div>
      <Plus className="w-4 h-4 text-slate-300 group-hover:text-[#ff2d20] group-hover:rotate-90 transition-all flex-shrink-0" />
    </Link>
  );
}

// ─── Section Header ───
function SectionHeader({
  icon,
  title,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  href: string;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <span className="text-slate-400">{icon}</span>
        <h2 className="text-base font-bold text-slate-800">{title}</h2>
      </div>
      <Link
        href={href}
        className={`text-xs font-semibold ${THEME.textPrimary} hover:text-red-600 transition-colors flex items-center gap-1`}
      >
        View All
        <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

// ══════════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ══════════════════════════════════════════════
export default function BFlowDashboard() {
  // ── Reactive Dexie queries (only runs in browser) ──
  const definitions =
    useLiveQuery(() => bflowDB.definitions.toArray()) ?? ([] as any[]);
  const workflows =
    useLiveQuery(() => bflowDB.workflowTemplates.toArray()) ?? ([] as any[]);
  const pipelines =
    useLiveQuery(() => bflowDB.pipelines.toArray()) ?? ([] as any[]);
  const reports =
    useLiveQuery(() => bflowDB.reportTemplates.toArray()) ?? ([] as any[]);

  // ── Derived stats ──
  const activeDefinitions = definitions.filter(
    (d) => d.status === "published",
  ).length;
  const runningPipelines = pipelines.filter(
    (p) => p.status === "running",
  ).length;
  const completedPipelines = pipelines.filter(
    (p) => p.status === "completed",
  ).length;

  // ── Recent definitions (last 5) ──
  const recentDefinitions = useMemo(
    () => [...definitions].reverse().slice(0, 5),
    [definitions],
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <span
              className={`w-10 h-10 bg-gradient-to-br ${THEME.gradient} rounded-xl flex items-center justify-center shadow-lg ${THEME.shadow}`}
            >
              <Rabbit className="w-5 h-5 text-white" />
            </span>
            BFlow Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1 ml-[3.25rem]">
            Overview of your workflow management workspace
          </p>
        </div>

        <Link
          href="/modules/bunny-flow/definitions"
          className={`hidden md:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold ${THEME.btnPrimary} shadow-md ${THEME.shadow}`}
        >
          <Plus className="w-4 h-4" />
          New Flow
        </Link>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Flows"
          value={definitions.length}
          icon={<GitBranch className="w-5 h-5 text-white" />}
          href="/modules/bunny-flow/definitions"
          accent="bg-gradient-to-br from-amber-400 to-orange-500"
          trend={
            definitions.length > 0 ? `${activeDefinitions} active` : undefined
          }
        />
        <StatCard
          label="Workflows"
          value={workflows.length}
          icon={<Workflow className="w-5 h-5 text-white" />}
          href="/modules/bunny-flow/workflows"
          accent="bg-gradient-to-br from-blue-400 to-indigo-500"
        />
        <StatCard
          label="Pipelines"
          value={pipelines.length}
          icon={<Container className="w-5 h-5 text-white" />}
          href="/modules/bunny-flow/pipelines"
          accent="bg-gradient-to-br from-emerald-400 to-teal-500"
          trend={
            pipelines.length > 0 ? `${runningPipelines} running` : undefined
          }
        />
        <StatCard
          label="Reports"
          value={reports.length}
          icon={<FileBarChart className="w-5 h-5 text-white" />}
          href="/modules/bunny-flow/reports"
          accent="bg-gradient-to-br from-rose-400 to-pink-500"
        />
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Recent Definitions ── */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6">
          <SectionHeader
            icon={<GitBranch className="w-5 h-5" />}
            title="Recent Flows"
            href="/modules/bunny-flow/definitions"
          />

          {recentDefinitions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Layers className="w-10 h-10 text-slate-200 mb-3" />
              <p className="text-sm font-medium text-slate-400">No flows yet</p>
              <Link
                href="/modules/bunny-flow/definitions"
                className={`mt-3 text-xs font-semibold ${THEME.textPrimary} hover:text-red-600 transition-colors`}
              >
                Create your first flow &rarr;
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentDefinitions.map((def) => (
                <RecentDefinitionRow
                  key={def.id}
                  id={def.id}
                  name={def.name}
                  status={def.status}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Pipeline Status ── */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6">
          <SectionHeader
            icon={<Activity className="w-5 h-5" />}
            title="Pipeline Status"
            href="/modules/bunny-flow/pipelines"
          />

          {pipelines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Play className="w-10 h-10 text-slate-200 mb-3" />
              <p className="text-sm font-medium text-slate-400">
                No pipelines yet
              </p>
              <Link
                href="/modules/bunny-flow/pipelines"
                className={`mt-3 text-xs font-semibold ${THEME.textPrimary} hover:text-red-600 transition-colors`}
              >
                Create your first pipeline &rarr;
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-50">
                <span className="text-sm font-semibold text-slate-700">
                  Completed
                </span>
                <span className="text-sm font-bold text-emerald-600">
                  {completedPipelines}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-amber-50">
                <span className="text-sm font-semibold text-slate-700">
                  Running
                </span>
                <span className="text-sm font-bold text-amber-600">
                  {runningPipelines}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-red-50">
                <span className="text-sm font-semibold text-slate-700">
                  Failed
                </span>
                <span className="text-sm font-bold text-red-600">
                  {pipelines.filter((p) => p.status === "failed").length}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-5 h-5 text-slate-400" />
          <h2 className="text-base font-bold text-slate-800">Quick Actions</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <QuickAction
            label="New Flow"
            description="Create a flow definition to start managing workflows"
            icon={<GitBranch className="w-5 h-5 text-white" />}
            href="/modules/bunny-flow/definitions"
            accent="bg-gradient-to-br from-amber-400 to-orange-500"
          />
          <QuickAction
            label="New Workflow"
            description="Create a workflow template with jobs and steps"
            icon={<Workflow className="w-5 h-5 text-white" />}
            href="/modules/bunny-flow/workflows"
            accent="bg-gradient-to-br from-blue-400 to-indigo-500"
          />
          <QuickAction
            label="New Pipeline"
            description="Run a workflow with custom variables"
            icon={<Container className="w-5 h-5 text-white" />}
            href="/modules/bunny-flow/pipelines"
            accent="bg-gradient-to-br from-emerald-400 to-teal-500"
          />
        </div>
      </div>

      {/* ── Workspace Summary ── */}
      <div
        className={`bg-gradient-to-br ${THEME.gradient} rounded-2xl p-6 md:p-8 text-white shadow-lg ${THEME.shadow}`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Rabbit className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Workspace Summary</h3>
              <p className="text-sm text-white/80">
                {definitions.length}{" "}
                {pluralize(definitions.length, "definition", "definitions")}{" "}
                &middot; {workflows.length}{" "}
                {pluralize(workflows.length, "workflow")} &middot;{" "}
                {pipelines.length} {pluralize(pipelines.length, "pipeline")}{" "}
                &middot; {reports.length} {pluralize(reports.length, "report")}
              </p>
            </div>
          </div>
          <Link
            href="/modules/bunny-flow/definitions"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm text-sm font-semibold transition-colors"
          >
            <GitBranch className="w-4 h-4" />
            Browse Flows
          </Link>
        </div>
      </div>
    </div>
  );
}
