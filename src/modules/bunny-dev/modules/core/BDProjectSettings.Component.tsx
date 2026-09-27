"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { Settings, Save, Trash2, Bot, Brain } from "lucide-react";
import { HelixAIProviderSelector } from "@/src/modules/helix";
import { bdDB } from "../../BDDatabase";
import { useBDProjectContext } from "./BDProject.Context";
import { bdProjectRepository } from "./BDProject.Repository";
import { BD_PROJECT_DEFAULT_AGENT_SETTINGS } from "./BDProject.Types";
import {
  BD_HANDOFF_POLICY_OPTIONS,
} from "../agent-manager/BDAgent.Types";
import { useBDAgents } from "../agent-manager/BDAgent.Hooks";
import { useBDAISettings } from "../ai-settings/BDAISettings.Context";
import BDPageHeader from "../../components/BDPageHeader";
import BDButton from "../../components/BDButton";
import BDBadge from "../../components/BDBadge";
import { useBDToast } from "../../components/BDToast";

export function BDProjectSettingsComponent() {
  const ctx = useBDProjectContext();
  const { projectId } = ctx;
  const { toast } = useBDToast();
  const { aiConfig } = useBDAISettings();
  const agents = useBDAgents(projectId);

  const overrideKey = `project-${projectId}`;
  const override = useLiveQuery(
    () => bdDB.aiSettings.get(overrideKey),
    [overrideKey],
  );

  const [agentSettings, setAgentSettings] = useState({
    ...BD_PROJECT_DEFAULT_AGENT_SETTINGS,
    ...(ctx.project?.agentSettings ?? {}),
  });

  // Re-sync when the project finishes loading or changes (render-time adjust).
  const settingsKey = `${projectId}:${ctx.project?.updatedAt ?? "pending"}`;
  const [prevSettingsKey, setPrevSettingsKey] = useState(settingsKey);
  if (settingsKey !== prevSettingsKey) {
    setPrevSettingsKey(settingsKey);
    setAgentSettings({
      ...BD_PROJECT_DEFAULT_AGENT_SETTINGS,
      ...(ctx.project?.agentSettings ?? {}),
    });
  }

  const saveAgentSettings = async () => {
    await bdProjectRepository.updateAgentSettings(projectId, agentSettings);
    toast({ title: "Agent settings saved", status: "success" });
  };

  const clearOverride = async () => {
    await bdDB.aiSettings.delete(overrideKey);
    toast({ title: "Override cleared — inheriting global AI", status: "success" });
  };

  return (
    <div className="flex flex-col gap-5">
      <BDPageHeader
        icon={Settings}
        title="Project Settings"
        description="Project-scoped AI and agent settings. Everything is local-first and stored in IndexedDB."
      />

      {/* AI override */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <Brain className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-slate-800">
            AI Override
          </h2>
          {override ? (
            <BDBadge color="primary">overridden</BDBadge>
          ) : (
            <BDBadge>inheriting global</BDBadge>
          )}
        </div>
        <p className="mb-3 text-xs text-slate-500">
          Global: <strong>{aiConfig.provider}</strong> / {aiConfig.model}. Set a
          per-project override below, or clear it to inherit.
        </p>
        <HelixAIProviderSelector
          table={bdDB.aiSettings}
          settingsKey={overrideKey}
        />
        {override && (
          <BDButton
            size="sm"
            variant="ghost"
            icon={Trash2}
            className="mt-3"
            onClick={clearOverride}
          >
            Clear override
          </BDButton>
        )}
      </div>

      {/* Agent settings */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <Bot className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-slate-800">
            Agent Settings
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">
              Concurrent agents
            </span>
            <input
              type="number"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              value={agentSettings.concurrent}
              onChange={(e) =>
                setAgentSettings({
                  ...agentSettings,
                  concurrent: Number(e.target.value),
                })
              }
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">
              Handoff policy
            </span>
            <select
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              value={agentSettings.handoffPolicy}
              onChange={(e) =>
                setAgentSettings({
                  ...agentSettings,
                  handoffPolicy: e.target
                    .value as typeof agentSettings.handoffPolicy,
                })
              }
            >
              {BD_HANDOFF_POLICY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">
              Default agent
            </span>
            <select
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              value={agentSettings.defaultAgentId ?? ""}
              onChange={(e) =>
                setAgentSettings({
                  ...agentSettings,
                  defaultAgentId: e.target.value || undefined,
                })
              }
            >
              <option value="">None</option>
              {(agents ?? []).map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">
              Escalation agent
            </span>
            <select
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              value={agentSettings.escalationAgentId ?? ""}
              onChange={(e) =>
                setAgentSettings({
                  ...agentSettings,
                  escalationAgentId: e.target.value || undefined,
                })
              }
            >
              <option value="">None</option>
              {(agents ?? []).map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4">
          {(
            [
              ["active", "Active"],
              ["autoAssign", "Auto-assign"],
              ["allowHandoff", "Allow handoff"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={!!agentSettings[key]}
                onChange={(e) =>
                  setAgentSettings({ ...agentSettings, [key]: e.target.checked })
                }
              />
              {label}
            </label>
          ))}
        </div>

        <BDButton
          size="sm"
          icon={Save}
          className="mt-4"
          onClick={saveAgentSettings}
        >
          Save agent settings
        </BDButton>
      </div>
    </div>
  );
}

export default BDProjectSettingsComponent;
