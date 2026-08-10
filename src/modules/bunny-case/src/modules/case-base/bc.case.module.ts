// bc.case.module.ts
//
// Case Base — Bunny CRUD module (Create / Update / Delete / Edit via Bunny)
// with an AI "Generate Scenario" header action.

import { BunnyConfig } from "@/src/modules/bunny/src/Bunny.Interface";
import { BCCaseScenario } from "./bc.case.entity";
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
import { WandSparkles } from "lucide-react";
import { bcCaseGenerateScenario } from "./bc.case.server";
import { bcCaseJoinList } from "./bc.case.entity";
import BCSettingsRepository from "../settings/bc.settings.repository";
import { AdminPanelDialogOption } from "@/src/modules/admin-panel/features/dialog/admin-panel-dialog.interface";
import { BCGenerateAIFormDialog } from "../generative-ai/bc.generative-ai.dialog";

// ── Module ─────────────────────────────────────────────────────────────────────

export const bcCaseModule: BunnyConfig<BCCaseScenario, BCCaseScenario> = {
  title: "Case",
  titlePlural: "Cases",
  rowKey: "id",
  onFormSuccess: { mode: "closeOnly" },
  columns: [
    { field: "title", header: "Title", isRowHeader: true, sortable: true },
    { field: "conflict", header: "Conflict" },
    { field: "objective", header: "Objective" },
  ],
  formConfig: {
    gridCols: 2,
    fields: [
      {
        name: "title",
        label: "Title",
        type: "text",
        colSpan: 2,
        rules: [{ rule: "required", message: "Title is required" }],
      },
      {
        name: "personaId",
        label: "Persona",
        type: "select",
        options: async () => {
          const personas = await bcDatabase.personas.toArray();
          return personas.map((p) => ({
            label: p.name,
            value: p.id as number,
          }));
        },
      },
      {
        name: "description",
        label: "Description",
        type: "textarea",
        rows: 2,
      },
      {
        name: "conflict",
        label: "Conflict",
        type: "textarea",
        rows: 2,
      },
      {
        name: "objective",
        label: "Objective",
        type: "textarea",
        rows: 2,
      },
      {
        name: "escalationPoints",
        label: "Escalation Points",
        type: "textarea",
        colSpan: 2,
        rows: 2,
        format: (value: unknown) => bcCaseJoinList(value),
      },
    ],
  },
  defaultHeaderActions: true,
  headerActions: [
    {
      id: "generate-scenario",
      label: "Generate Scenario with AI",
      icon: React.createElement(WandSparkles),
      variant: "primary",
      onClick: async (context) => {
        const { adminPanel } = context!;
        const action: AdminPanelDialogOption = {
          title: "Generate AI Scenario",
          actionId: "generate-scenario",
          contentOnly: true,
          hideFooter: true,
          size: "xl",
          fullHeight: false,
          children: React.createElement(BCGenerateAIFormDialog, {
            title: "Generate AI Scenario",
            description:
              "Flesh out a training scenario from a persona and a raw conflict.",
            fields: [
              {
                name: "title",
                label: "Case Title",
                type: "text",
                required: true,
              },
              { name: "personaName", label: "Persona Name", type: "text" },
              {
                name: "personaProfile",
                label: "Persona Profile (paste from Persona Architect)",
                type: "textarea",
              },
              { name: "conflict", label: "Raw Conflict", type: "textarea" },
            ],
            includeOption: true,
            generateLabel: "Generate Scenario",
            onGenerate: async (values, aiOptions) => {
              try {
                const settingsRepo = new BCSettingsRepository();
                const aiConfig = await settingsRepo.getActiveAIConfig();
                const scenario = await bcCaseGenerateScenario(
                  values.title ?? "",
                  values.personaName ?? "",
                  values.personaProfile ?? "",
                  values.conflict ?? "",
                  aiConfig,
                  aiOptions,
                );

                // Link to an existing persona by name when it matches,
                // otherwise leave the case unlinked.
                const linkedPersona = values.personaName
                  ? (await bcDatabase.personas.toArray()).find(
                      (p) =>
                        p.name.trim().toLowerCase() ===
                        values.personaName!.trim().toLowerCase(),
                    )
                  : undefined;

                // Persist the generated scenario directly so a record appears
                // in the table immediately after generation.
                const record: BCCaseScenario = {
                  title: values.title,
                  personaId: linkedPersona?.id,
                  description: scenario.description,
                  conflict: scenario.conflict,
                  objective: scenario.objective,
                  escalationPoints: bcCaseJoinList(scenario.escalationPoints),
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                };

                await bcDatabase.cases.add(record);
                return {
                  success: true,
                  message: `Case "${values.title}" generated and saved successfully.`,
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
                result?.message ?? "Case generated and saved successfully.",
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
    ): Promise<GetAllResponse<BCCaseScenario>> {
      return adminPanelQueryResponseAll({
        data: await bcDatabase.cases.toArray(),
      });
    },
    getOne: async function (
      id: string | number,
    ): Promise<BCCaseScenario | undefined> {
      return await bcDatabase.cases.get(Number(id));
    },
  },
  mutation: {
    create: async function (
      data: BCCaseScenario,
    ): Promise<AdminPanelResult<BCCaseScenario, unknown>> {
      const id = await bcDatabase.cases.add(data);
      return adminPanelResultSuccess<BCCaseScenario>(
        (await bcDatabase.cases.get(id)) as BCCaseScenario,
      );
    },
    update: async function (
      id: AdminPanelId,
      data: BCCaseScenario,
    ): Promise<AdminPanelResult<BCCaseScenario, unknown> | undefined> {
      if (typeof id !== "number") {
        throw new Error("Invalid ID type. Expected a number.");
      }
      await bcDatabase.cases.update(id, data);
      return adminPanelResultSuccess<BCCaseScenario>(
        (await bcDatabase.cases.get(id)) as BCCaseScenario,
      );
    },
    delete: async function (
      iid: AdminPanelId,
    ): Promise<AdminPanelResult<BCCaseScenario, unknown> | undefined> {
      const id = Number(iid);
      await bcDatabase.cases.delete(id);
      return adminPanelResultSuccess<BCCaseScenario>({} as BCCaseScenario);
    },
  },
};
