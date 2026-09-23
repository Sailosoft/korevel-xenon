// bc.case.module.ts
//
// Case Base — Bunny CRUD module (Create / Update / Delete / Edit via Bunny)
// with an AI "Generate Scenario" header action. A case is just a Title and a
// rich-text Content field, keeping it maximally flexible.

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
  ],
  formConfig: {
    gridCols: 1,
    fields: [
      {
        name: "title",
        label: "Title",
        type: "text",
        rules: [{ rule: "required", message: "Title is required" }],
      },
      {
        name: "content",
        label: "Content",
        type: "editor",
        rules: [{ rule: "required", message: "Content is required" }],
        placeholder:
          "Describe the situation, the conflict or topic, what success looks like, and possible escalations…",
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
              "Flesh out a flexible training case from a title and your raw instructions.",
            fields: [
              {
                name: "title",
                label: "Case Title",
                type: "text",
                required: true,
              },
              {
                name: "instructions",
                label: "Instructions",
                type: "textarea",
                placeholder:
                  "Describe the situation, the people involved, the conflict or topic, and anything the AI should emphasize…",
              },
            ],
            includeOption: true,
            generateLabel: "Generate Scenario",
            onGenerate: async (values, aiOptions) => {
              try {
                const settingsRepo = new BCSettingsRepository();
                const aiConfig = await settingsRepo.getActiveAIConfig();
                const scenario = await bcCaseGenerateScenario(
                  values.title ?? "",
                  values.instructions ?? "",
                  aiConfig,
                  aiOptions,
                );

                // Persist the generated scenario directly so a record appears
                // in the table immediately after generation.
                const record: BCCaseScenario = {
                  title: values.title,
                  content: scenario.content,
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
      const id = await bcDatabase.cases.add({
        ...data,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
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
      await bcDatabase.cases.update(id, { ...data, updatedAt: Date.now() });
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
