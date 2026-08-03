// BSAgent.Module — BunnyFeature module for Bunny AI Studio Agents.
//
// Replaces the bespoke BSAgent.Component CRUD UI with the reusable Bunny
// feature framework (feature: "use BunnyFeature instead of creating your own
// component"). Provides table columns + form fields + the Phaze data layer.
//
// An Agent has: name, optional agentPoolId, persona, skills (comma separated),
// optional provider/model override. Ungrouped agents (no agentPoolId) are
// global.

import {
  BunnyFieldRendererProps,
} from "@/src/modules/bunny/src/form/BunnyForm.Interface";
import { BunnyFeature } from "@/src/modules/bunny/src/feature/BunnyFeature";
import {
  HELIX_PROVIDER_LABELS,
  HELIX_AI_MODELS,
} from "@/src/modules/helix";
import type { HelixAIProvider } from "@/src/modules/helix";
import { bsDB } from "../../BSDatabase";
import type { BSAgent } from "./BSAgent.Types";

// ─── Provider / Model override fields ───────────────────────────────────
// The two selects are interdependent (model list depends on provider), so we
// use a single "render" field that reads the whole form snapshot (formData).

const PROVIDER_OPTIONS = (Object.keys(HELIX_PROVIDER_LABELS) as HelixAIProvider[])
  .filter((p) => p !== "default")
  .map((p) => ({ label: HELIX_PROVIDER_LABELS[p], value: p }));

const PROVIDER_MODEL_STYLES =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white";

function AgentProviderModelField({
  onChange,
  formData,
}: BunnyFieldRendererProps) {
  const provider = (formData.provider as HelixAIProvider | undefined) ?? "";
  const models = provider ? (HELIX_AI_MODELS[provider] ?? []) : [];

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Provider Override
        </label>
        <select
          value={provider}
          onChange={(e) => {
            const p = e.target.value as HelixAIProvider | "";
            onChange("provider", p || undefined);
            onChange(
              "model",
              p ? (HELIX_AI_MODELS[p]?.[0] ?? "") : undefined,
            );
          }}
          className={PROVIDER_MODEL_STYLES}
        >
          <option value="">Inherit global</option>
          {PROVIDER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Model Override
        </label>
        <select
          value={(formData.model as string | undefined) ?? ""}
          onChange={(e) => onChange("model", e.target.value || undefined)}
          disabled={!provider || models.length === 0}
          className={`${PROVIDER_MODEL_STYLES} disabled:opacity-50`}
        >
          {!provider && <option value="">Inherit global</option>}
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ─── Module ─────────────────────────────────────────────────────────────

export const bsAgentModule = BunnyFeature.create<BSAgent, BSAgent>(
  "Agent",
  "id",
  (feature) => {
    feature.setModuleUrl("/modules/bunny-studio/agents*");
    feature.useDefault();

    feature.configureTable((table) => {
      table.addColumns([
        {
          field: "name",
          header: "Name",
          sortable: true,
          isRowHeader: true,
        },
        {
          field: "agentPoolId",
          header: "Agent Pool",
          sortable: true,
          mapping: {
            getRecords: async (): Promise<Record<string, unknown>[]> => {
              const res = await bsDB.agentPoolsRepo.query.getAll({
                page: 0,
                pageSize: 0,
              });
              return res.data as unknown as Record<string, unknown>[];
            },
            key: "id",
            label: "name",
            fallback: "Global",
          },
        },
        {
          field: "persona",
          header: "Persona",
          sortable: false,
          render: (row) =>
            row.persona.length > 80
              ? `${row.persona.slice(0, 80)}…`
              : row.persona,
        },
        {
          field: "skills",
          header: "Skills",
          sortable: false,
          render: (row) => row.skills || "—",
        },
        {
          field: "provider",
          header: "Provider",
          sortable: true,
          render: (row) => row.provider || "—",
        },
        {
          field: "model",
          header: "Model",
          sortable: true,
          render: (row) => row.model || "—",
        },
      ]);
    });

    feature.configureForm((form) => {
      form.setOnSuccess({ mode: "closeOnly" });
      form.addFields([
        {
          name: "name",
          label: "Name",
          placeholder: "e.g. Senior Code Reviewer",
          type: "text",
          required: true,
        },
        {
          name: "agentPoolId",
          label: "Agent Pool",
          placeholder: "Select a pool (optional)",
          type: "select",
          required: false,
          options: () => bsDB.agentPoolsRepo.toSelectOptions(),
        },
        {
          name: "persona",
          label: "Persona",
          placeholder: "System instruction for this agent…",
          type: "textarea",
          required: true,
          rows: 3,
        },
        {
          name: "skills",
          label: "Skills (comma separated)",
          placeholder: "e.g. Code Review, Debugging, Refactoring",
          type: "text",
          required: false,
        },
        {
          name: "providerModelOverride",
          label: "Provider / Model Override",
          type: "render",
          render: AgentProviderModelField,
          colSpan: 2,
        },
      ]);
      form.setGridCols(1);
    });

    feature.useDataLayer(bsDB.agentsRepo.dataLayer);
  },
);
