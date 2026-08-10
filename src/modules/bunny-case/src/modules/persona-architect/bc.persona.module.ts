// bc.persona.module.ts
//
// Persona Architect — Bunny CRUD module (Create / Update / Delete / Edit via
// Bunny) with an AI "Generate Profile" header action.

import { BunnyConfig } from "@/src/modules/bunny/src/Bunny.Interface";
import {
  BCCasePersona,
  bcPersonaJoinList,
  bcPersonaParseList,
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

// ── Module ─────────────────────────────────────────────────────────────────────

export const bcPersonaModule: BunnyConfig<BCCasePersona, BCCasePersona> = {
  title: "Persona",
  titlePlural: "Personas",
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
        placeholder: "Comma-separated, e.g. Impatient, Confused, High-Value",
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
      { name: "triggers", label: "Triggers", type: "textarea", rows: 2 },
      { name: "preferences", label: "Preferences", type: "textarea", rows: 2 },
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
      id: "generate-profile",
      label: "Generate AI Profile",
      icon: React.createElement(Sparkles),
      variant: "primary",
      onClick: async (context) => {
        const { adminPanel } = context!;
        const action: AdminPanelDialogOption = {
          title: "Generate AI Persona Profile",
          actionId: "generate-persona-profile",
          fields: [
            { name: "name", label: "Persona Name", type: "text" },
            { name: "traits", label: "Traits (comma-separated)", type: "textarea" },
            { name: "description", label: "Description", type: "textarea" },
          ],
          async onConfirm({ form }) {
            adminPanel.dialog.setLoading(true);
            const { name, traits, description } = Object.fromEntries(
              form,
            ) as Record<string, string>;
            if (!name) {
              adminPanel.dialog.setLoading(false);
              return { success: false, message: "Name is required." };
            }

            const settingsRepo = new BCSettingsRepository();
            const aiConfig = await settingsRepo.getActiveAIConfig();
            const profile = await bcPersonaGenerateProfile(
              name,
              bcPersonaParseList(traits),
              description ?? "",
              aiConfig,
            );

            // Persist the generated persona directly so a record appears in
            // the table immediately after generation.
            const persona: BCCasePersona = {
              name,
              traits: bcPersonaJoinList(bcPersonaParseList(traits)),
              description: description ?? "",
              psychologicalProfile: profile.psychologicalProfile,
              triggers: bcPersonaJoinList(profile.triggers),
              preferences: bcPersonaJoinList(profile.preferences),
              communicationStyle: profile.communicationStyle,
              aiSummary: profile.aiSummary,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };

            await bcDatabase.personas.add(persona);
            await adminPanel.table.fetchData();
            adminPanel.notify.success(
              `Persona "${name}" generated and saved successfully.`,
            );

            adminPanel.dialog.setLoading(false);
            return { success: true };
          },
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
      const id = await bcDatabase.personas.add(data);
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
      await bcDatabase.personas.update(id, data);
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
