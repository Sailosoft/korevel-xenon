/**
 * BFlowVariableGroupDetail.Component — Variable group detail view with
 * workflow selector and variables reference table.
 *
 * Displays the variable group's metadata, allows selecting a workflow template
 * whose variable definitions serve as the pattern for variables in this group,
 * and shows the list of flow variables within the group.
 */

"use client";

import { useCallback, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, List, Workflow, Variable } from "lucide-react";
import Link from "next/link";
import { bflowDB } from "../database/BFlowDatabase";
import { parse as parseYaml } from "yaml";
import { BFlowWorkflowSchema } from "../workflow/BFlowWorkflow.Types";
import type { BFlowVariable } from "../workflow/BFlowWorkflow.Types";
import BFlowScopedFlowVariables from "../flow-variable/BFlowScopedFlowVariables";

// ─── Props ────────────────────────────────────────────────────────────

export interface BFlowVariableGroupDetailProps {
  flowId: string;
  groupId: string;
}

// ─── Component ────────────────────────────────────────────────────────

export default function BFlowVariableGroupDetail({
  flowId,
  groupId,
}: BFlowVariableGroupDetailProps) {
  const group = useLiveQuery(
    () => bflowDB.variableGroups.get(groupId),
    [groupId],
  );

  const variablesCount = useLiveQuery(
    () => bflowDB.flowVariables.where("groupId").equals(groupId).count(),
    [groupId],
  );

  // Load all workflow templates scoped to this flow
  const workflows = useLiveQuery(
    () => bflowDB.workflowTemplates.where("flowId").equals(flowId).toArray(),
    [flowId],
  );

  // Load the selected workflow based on the group's workflowId
  const selectedWorkflow = useLiveQuery(
    () =>
      group?.workflowId
        ? bflowDB.workflowTemplates.get(group.workflowId)
        : undefined,
    [group?.workflowId],
  );

  // Parse the selected workflow's YAML to extract variable definitions
  const workflowVariables: BFlowVariable[] = useMemo(() => {
    if (!selectedWorkflow?.templateYaml) return [];
    try {
      const parsed = parseYaml(selectedWorkflow.templateYaml);
      const result = BFlowWorkflowSchema.safeParse(parsed);
      if (!result.success) return [];
      return result.data.variables ?? [];
    } catch {
      return [];
    }
  }, [selectedWorkflow?.templateYaml]);

  // Handle workflow selection change
  const handleWorkflowChange = useCallback(
    async (workflowId: string | null) => {
      if (!group) return;
      await bflowDB.variableGroups.update(groupId, {
        workflowId: workflowId ?? undefined,
      });
    },
    [group, groupId],
  );

  return (
    <div className="space-y-6">
      {/* ── Back navigation ── */}
      <Link
        href={`/modules/bunny-flow/flow/${flowId}/variables`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#ff2d20] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Variable Groups
      </Link>

      {/* ── Group Header ── */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-100 shrink-0">
          <List className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-slate-800">
            {group?.name ?? "Loading..."}
          </h1>
          <p className="text-sm text-slate-400">
            {group?.slug ?? ""}
            {variablesCount !== undefined
              ? ` — ${variablesCount} variable${variablesCount !== 1 ? "s" : ""}`
              : ""}
          </p>
        </div>
      </div>

      {/* ── Workflow Template Card (selector + variables reference) ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6 space-y-5">
        {/* Selector Section */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Workflow className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-700">
                Workflow Template
              </h2>
              <p className="text-xs text-slate-400">
                Select a workflow. Variables in this group will follow the
                variable definitions from the selected workflow's YAML schema.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* "None" option */}
            <button
              onClick={() => handleWorkflowChange(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                !group?.workflowId
                  ? "bg-slate-100 border-slate-300 text-slate-700"
                  : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              None
            </button>

            {/* Workflow options */}
            {(workflows ?? []).map((wf) => (
              <button
                key={wf.id}
                onClick={() => handleWorkflowChange(wf.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  group?.workflowId === wf.id
                    ? "bg-amber-50 border-amber-300 text-amber-700 shadow-sm"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {wf.name}
                <span className="ml-1.5 text-[10px] text-slate-400">
                  v{wf.version ?? "—"}
                </span>
              </button>
            ))}

            {(workflows ?? []).length === 0 && (
              <p className="text-xs text-slate-400 italic">
                No workflow templates found for this flow. Create one in the
                Workflows section first.
              </p>
            )}
          </div>
        </div>

        {/* Variables Reference Section (always visible when a workflow is selected) */}
        {selectedWorkflow && (
          <div className="border-t border-slate-100 pt-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                <Variable className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-700">
                  Workflow Variables
                </h2>
                <p className="text-xs text-slate-400">
                  Variables defined in the &ldquo;{selectedWorkflow.name}&rdquo;
                  workflow YAML. Variables in this group follow this pattern.
                </p>
              </div>
            </div>

            {workflowVariables.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left font-semibold text-slate-500 pb-2 pr-4">
                        Name
                      </th>
                      <th className="text-left font-semibold text-slate-500 pb-2 pr-4">
                        Type
                      </th>
                      <th className="text-left font-semibold text-slate-500 pb-2 pr-4">
                        Default Value
                      </th>
                      <th className="text-left font-semibold text-slate-500 pb-2">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {workflowVariables.map((v, idx) => (
                      <tr
                        key={v.name ?? `var-${idx}`}
                        className="border-b border-slate-50 last:border-0"
                      >
                        <td className="py-2 pr-4 font-mono text-slate-800">
                          {v.name}
                        </td>
                        <td className="py-2 pr-4">
                          <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                            {v.type ?? "text"}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-slate-500">
                          {v.value || "—"}
                        </td>
                        <td className="py-2 text-slate-400">
                          {v.description || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                No variables defined in this workflow's YAML schema.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Variables List (Bunny-backed) ── */}
      <BFlowScopedFlowVariables groupId={groupId} />
    </div>
  );
}
