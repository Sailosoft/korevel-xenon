// bc.persona.module.ts
//
// Persona Architect — Bunny CRUD module (Create / Update / Delete / Edit via
// Bunny) with an AI "Generate Profile" header action.
//
// A persona is: Name + Mode (where it can be used) + Traits (filterable
// multi-select) + AI Prompt (the role-play instruction).

import { BunnyConfig } from "@/src/modules/bunny/src/Bunny.Interface";
import {
  BCCasePersona,
  BC_PERSONA_MODE_OPTIONS,
  type BCPersonaMode,
} from "./bc.persona.entity";
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
import { bcPersonaGenerateProfile } from "./bc.persona.server";
import BCSettingsRepository from "../settings/bc.settings.repository";
import { AdminPanelDialogOption } from "@/src/modules/admin-panel/features/dialog/admin-panel-dialog.interface";
import { BCGenerateAIFormDialog } from "../generative-ai/bc.generative-ai.dialog";
import BCPersonaTraitsField from "./bc.persona.traits.field";

// ── Module ─────────────────────────────────────────────────────────────────────

export const bcPersonaModule: BunnyConfig<BCCasePersona, BCCasePersona> = {
  title: "Persona",
  titlePlural: "Personas",
  rowKey: "id",
  onFormSuccess: { mode: "closeOnly" },
  columns: [
    { field: "name", header: "Name", isRowHeader: true, sortable: true },
    { field: "mode", header: "Mode" },
    { field: "traits", header: "Traits" },
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
        name: "mode",
        label: "Mode",
        type: "select",
        options: BC_PERSONA_MODE_OPTIONS.map((o) => ({
          label: o.label,
          value: o.value,
        })),
        defaultValue: "person" as BCPersonaMode,
        rules: [{ rule: "required", message: "Mode is required" }],
      },
      {
        name: "traits",
        label: "Traits",
        type: "custom",
        component: BCPersonaTraitsField,
        colSpan: 2,
      },
      {
        name: "aiPrompt",
        label: "AI Prompt",
        type: "editor",
        colSpan: 2,
        placeholder:
          "Instruction the AI follows when role-playing this persona — or use 'Generate AI Profile'…",
      },
    ],
  },
  defaultHeaderActions: true,
  headerActions: [
    {
      id: "generate-profile",
      label: "Generate AI Profile",
      icon: React.createElement(Sparkles),
      variant: "primary",
      onClick: async (context) => {
        const { adminPanel } = context!;
        const action: AdminPanelDialogOption = {
          title: "Generate AI Persona Profile",
          actionId: "generate-persona-profile",
          contentOnly: true,
          hideFooter: true,
          size: "xl",
          fullHeight: false,
          children: React.createElement(BCGenerateAIFormDialog, {
            title: "Generate AI Persona Profile",
            description:
              "Turn a name and your instruction into a consistent role-play prompt.",
            fields: [
              { name: "name", label: "Persona Name", type: "text", required: true },
              {
                name: "instruction",
                label: "Instruction",
                type: "textarea",
                placeholder:
                  "Who is this person? How do they behave, speak, escalate?…",
              },
            ],
            generateLabel: "Generate Profile",
            onGenerate: async (values) => {
              try {
                const settingsRepo = new BCSettingsRepository();
                const aiConfig = await settingsRepo.getActiveAIConfig();
                const profile = await bcPersonaGenerateProfile(
                  values.name ?? "",
                  values.instruction ?? "",
                  aiConfig,
                );

                // Persist the generated persona directly so a record appears
                // in the table immediately after generation.
                const persona: BCCasePersona = {
                  name: values.name ?? "",
                  mode: "person",
                  traits: "",
                  aiPrompt: profile.aiPrompt,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                };

                await bcDatabase.personas.add(persona);
                return {
                  success: true,
                  message: `Persona "${persona.name}" generated and saved successfully.`,
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
                result?.message ?? "Persona generated and saved successfully.",
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
    ): Promise<GetAllResponse<BCCasePersona>> {
      return adminPanelQueryResponseAll({
        data: await bcDatabase.personas.toArray(),
      });
    },
    getOne: async function (
      id: string | number,
    ): Promise<BCCasePersona | undefined> {
      return await bcDatabase.personas.get(Number(id));
    },
  },
  mutation: {
    create: async function (
      data: BCCasePersona,
    ): Promise<AdminPanelResult<BCCasePersona, unknown>> {
      const id = await bcDatabase.personas.add({
        ...data,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return adminPanelResultSuccess<BCCasePersona>(
        (await bcDatabase.personas.get(id)) as BCCasePersona,
      );
    },
    update: async function (
      id: AdminPanelId,
      data: BCCasePersona,
    ): Promise<AdminPanelResult<BCCasePersona, unknown> | undefined> {
      if (typeof id !== "number") {
        throw new Error("Invalid ID type. Expected a number.");
      }
      await bcDatabase.personas.update(id, { ...data, updatedAt: Date.now() });
      return adminPanelResultSuccess<BCCasePersona>(
        (await bcDatabase.personas.get(id)) as BCCasePersona,
      );
    },
    delete: async function (
      iid: AdminPanelId,
    ): Promise<AdminPanelResult<BCCasePersona, unknown> | undefined> {
      const id = Number(iid);
      await bcDatabase.personas.delete(id);
      return adminPanelResultSuccess<BCCasePersona>({} as BCCasePersona);
    },
  },
};
