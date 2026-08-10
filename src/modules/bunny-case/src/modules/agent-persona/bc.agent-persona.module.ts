// bc.agent-persona.module.ts
//
// Agent Persona Architect — Bunny CRUD module with an AI "Generate Profile"
// header action (mirrors the customer Persona Architect but for the agent).

import { BunnyConfig } from "@/src/modules/bunny/src/Bunny.Interface";
import {
  BCAgentPersona,
  bcAgentPersonaJoinList,
  bcAgentPersonaParseList,
} from "./bc.agent-persona.entity";
import {
  AdminPanelQueryOptions,
  GetAllResponse,
} from "@/src/modules/admin-panel/features/query/admin-panel-query.interface";
import { AdminPanelId } from "@/src/modules/admin-panel/features/id/admin-panel-id.interface";
import {
  AdminPanelResult,
  adminPanelResultSuccess,
} from "@/src/modules/admin-panel/shared/admin-panel-result";
import { bcDatabase } from "../../database/bc.database";
import { adminPanelQueryResponseAll } from "@/src/modules/admin-panel/features/query/admin-panel-query.util";
import React from "react";
import { Sparkles } from "lucide-react";
import { bcAgentPersonaGenerateProfile } from "./bc.agent-persona.server";
import BCSettingsRepository from "../settings/bc.settings.repository";
import { AdminPanelDialogOption } from "@/src/modules/admin-panel/features/dialog/admin-panel-dialog.interface";
import { BCGenerateAIFormDialog } from "../generative-ai/bc.generative-ai.dialog";

// ── Module ─────────────────────────────────────────────────────────────────────

export const bcAgentPersonaModule: BunnyConfig<BCAgentPersona, BCAgentPersona> = {
  title: "Agent Persona",
  titlePlural: "Agent Personas",
  rowKey: "id",
  onFormSuccess: { mode: "closeOnly" },
  columns: [
    { field: "name", header: "Name", isRowHeader: true, sortable: true },
    { field: "traits", header: "Traits" },
    { field: "communicationStyle", header: "Communication Style" },
  ],
  formConfig: {
    gridCols: 2,
    fields: [
      {
        name: "name",
        label: "Name",
        type: "text",
        rules: [{ rule: "required", message: "Name is required" }],
      },
      {
        name: "traits",
        label: "Traits",
        type: "textarea",
        rows: 2,
        placeholder: "Comma-separated, e.g. Calm, Structured, Proactive",
      },
      {
        name: "description",
        label: "Description",
        type: "textarea",
        colSpan: 2,
        rows: 2,
      },
      {
        name: "psychologicalProfile",
        label: "Psychological Profile (AI)",
        type: "textarea",
        colSpan: 2,
        rows: 3,
      },
      {
        name: "principles",
        label: "Principles",
        type: "textarea",
        rows: 2,
      },
      {
        name: "communicationStyle",
        label: "Communication Style",
        type: "textarea",
        colSpan: 2,
        rows: 2,
      },
    ],
  },
  defaultHeaderActions: true,
  headerActions: [
    {
      id: "generate-agent-profile",
      label: "Generate AI Agent Profile",
      icon: React.createElement(Sparkles),
      variant: "primary",
      onClick: async (context) => {
        const { adminPanel } = context!;
        const action: AdminPanelDialogOption = {
          title: "Generate AI Agent Persona",
          actionId: "generate-agent-persona",
          contentOnly: true,
          hideFooter: true,
          size: "xl",
          fullHeight: false,
          children: React.createElement(BCGenerateAIFormDialog, {
            title: "Generate AI Agent Persona",
            description:
              "Design a well-rounded agent persona whose behaviour trainees mirror.",
            fields: [
              {
                name: "name",
                label: "Agent Persona Name",
                type: "text",
                required: true,
              },
              {
                name: "traits",
                label: "Traits (comma-separated)",
                type: "textarea",
              },
              { name: "description", label: "Description", type: "textarea" },
            ],
            includeOption: true,
            generateLabel: "Generate Profile",
            onGenerate: async (values, aiOptions) => {
              try {
                const settingsRepo = new BCSettingsRepository();
                const aiConfig = await settingsRepo.getActiveAIConfig();
                const profile = await bcAgentPersonaGenerateProfile(
                  values.name ?? "",
                  bcAgentPersonaParseList(values.traits),
                  values.description ?? "",
                  aiConfig,
                  aiOptions,
                );

                const persona: BCAgentPersona = {
                  name: values.name,
                  traits: bcAgentPersonaJoinList(
                    bcAgentPersonaParseList(values.traits),
                  ),
                  description: values.description ?? "",
                  psychologicalProfile: profile.psychologicalProfile,
                  principles: bcAgentPersonaJoinList(profile.principles),
                  communicationStyle: profile.communicationStyle,
                  aiSummary: profile.aiSummary,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                };

                await bcDatabase.agentPersonas.add(persona);
                return {
                  success: true,
                  message: `Agent persona "${values.name}" generated and saved successfully.`,
                };
              } catch (err) {
                return {
                  success: false,
                  message:
                    err instanceof Error ? err.message : "Generation failed.",
                };
              }
            },
            onSaved: async (result) => {
              await adminPanel.table.fetchData();
              adminPanel.notify.success(
                result?.message ??
                  "Agent persona generated and saved successfully.",
              );
              adminPanel.dialog.closeDialog();
            },
            onClose: () => adminPanel.dialog.closeDialog(),
          }),
          onConfirm: async () => ({ success: true }),
        };
        adminPanel.dialog.openDialog(action);
      },
    },
  ],
  defaultRowActions: true,
  modalHeaderActions: [],
  query: {
    getAll: async function (
      _options: AdminPanelQueryOptions,
      _overrideOptions?: AdminPanelQueryOptions,
    ): Promise<GetAllResponse<BCAgentPersona>> {
      return adminPanelQueryResponseAll({
        data: await bcDatabase.agentPersonas.toArray(),
      });
    },
    getOne: async function (
      id: string | number,
    ): Promise<BCAgentPersona | undefined> {
      return await bcDatabase.agentPersonas.get(Number(id));
    },
  },
  mutation: {
    create: async function (
      data: BCAgentPersona,
    ): Promise<AdminPanelResult<BCAgentPersona, unknown>> {
      const id = await bcDatabase.agentPersonas.add(data);
      return adminPanelResultSuccess<BCAgentPersona>(
        (await bcDatabase.agentPersonas.get(id)) as BCAgentPersona,
      );
    },
    update: async function (
      id: AdminPanelId,
      data: BCAgentPersona,
    ): Promise<AdminPanelResult<BCAgentPersona, unknown> | undefined> {
      if (typeof id !== "number") {
        throw new Error("Invalid ID type. Expected a number.");
      }
      await bcDatabase.agentPersonas.update(id, data);
      return adminPanelResultSuccess<BCAgentPersona>(
        (await bcDatabase.agentPersonas.get(id)) as BCAgentPersona,
      );
    },
    delete: async function (
      iid: AdminPanelId,
    ): Promise<AdminPanelResult<BCAgentPersona, unknown> | undefined> {
      const id = Number(iid);
      await bcDatabase.agentPersonas.delete(id);
      return adminPanelResultSuccess<BCAgentPersona>({} as BCAgentPersona);
    },
  },
};
