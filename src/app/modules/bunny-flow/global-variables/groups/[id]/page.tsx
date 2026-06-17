"use client";

import { use } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Eye } from "lucide-react";
import Link from "next/link";
import { bflowDB } from "@/src/modules/bunny-flow/src/database/BFlowDatabase";

export const dynamic = "force-dynamic";

interface GlobalVariableDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function GlobalVariableDetailPage({
  params,
}: GlobalVariableDetailPageProps) {
  const { id } = use(params);

  const variable = useLiveQuery(() => bflowDB.globalVariables.get(id), [id]);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── Back navigation ── */}
      <Link
        href="/modules/bunny-flow/global-variables"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#ff2d20] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Global Variables
      </Link>

      {/* ── Variable Header ── */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-100">
          <Eye className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {variable?.name ?? "Loading..."}
          </h1>
          <p className="text-sm text-slate-400">
            {variable?.type ?? ""}
            {variable?.group ? ` — ${variable.group}` : ""}
          </p>
        </div>
        {variable && (
          <span className="ml-auto px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
            {variable.type}
          </span>
        )}
      </div>

      {/* ── Variable Details ── */}
      {variable && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Value
            </label>
            <p className="mt-1 text-sm font-medium text-slate-800 bg-slate-50 rounded-xl px-4 py-3">
              {variable.value}
            </p>
          </div>

          {variable.description && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Description
              </label>
              <p className="mt-1 text-sm text-slate-600">
                {variable.description}
              </p>
            </div>
          )}

          {variable.group && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Group
              </label>
              <p className="mt-1 text-sm font-medium text-slate-800">
                {variable.group}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Created
              </label>
              <p className="mt-1 text-sm text-slate-600">
                {variable.createdAt?.toLocaleDateString() ?? "—"}
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Updated
              </label>
              <p className="mt-1 text-sm text-slate-600">
                {variable.updatedAt?.toLocaleDateString() ?? "—"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
