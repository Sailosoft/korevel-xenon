// bui.author-skills.module.ts
import { BunnyConfig } from "@/src/modules/bunny/src/Bunny.Interface";
import {
  BUIAuthorSkill,
  BUIAuthorSkillPromptType,
} from "./bui.author-skills.entity";
import {
  AdminPanelQueryOptions,
  GetAllResponse,
} from "@/src/modules/admin-panel/features/query/admin-panel-query.interface";
import { AdminPanelId } from "@/src/modules/admin-panel/features/id/admin-panel-id.interface";
import {
  AdminPanelResult,
  adminPanelResultSuccess,
} from "@/src/modules/admin-panel/shared/admin-panel-result";
import { buiDatabase } from "../../database/bui.database";
import { adminPanelQueryResponseAll } from "../../../../admin-panel/features/query/admin-panel-query.util";
import React from "react";
import { CircleFadingArrowUp } from "lucide-react";
import { buiAuthorSkillServerEnhanceWithParams } from "./bui.author-skills.server.enhance";
import { buiContainer } from "../../container/bui.container";
import { AdminPanelDialogOption } from "@/src/modules/admin-panel/features/dialog/admin-panel-dialog.interface";
import BUISettingsRepository from "../settings/bui.settings.repository";

export const buiAuthorSkillModule: BunnyConfig<BUIAuthorSkill, BUIAuthorSkill> =
  {
    title: "Author Skill",
    titlePlural: "Author Skills",
    rowKey: "name",
    onFormSuccess: {
      mode: "closeOnly",
    },
    columns: [
      {
        field: "name",
        header: "Name",
        isRowHeader: true,
        sortable: true,
      },
      {
        field: "description",
        header: "Description",
      },
    ],
    formConfig: {
      fields: [
        {
          name: "name",
          label: "Name",
          type: "text",
          rules: [
            {
              rule: "required",
              message: "Name is required",
            },
          ],
        },
        {
          name: "description",
          label: "Description",
          type: "editor",
          rules: [
            {
              rule: "required",
              message: "Description is required",
            },
          ],
        },
      ],
    },
    defaultHeaderActions: true,
    headerActions: [],
    defaultRowActions: true,
    modalHeaderActions: [
      {
        id: "enhanced",
        label: "Enhance Skill With AI",
        icon: React.createElement(CircleFadingArrowUp),
        variant: "default",
        hide: ["view"],
        onClick: async (context) => {
          const { adminPanel } = context!;
          const action: AdminPanelDialogOption = {
            title: "Enhance Author Skill with AI",
            actionId: "enhance",
            fields: [
              {
                name: "promptType",
                label: "AI Tone Style",
                type: "select",
                defaultValue: "professional",
                options: [
                  { label: "Professional", value: "professional" },
                  { label: "Creative", value: "creative" },
                  { label: "Short Blurb", value: "short" },
                  { label: "Detailed Breakdown", value: "detailed" },
                ],
              },
              {
                name: "name",
                label: "Name",
                type: "text",
              },
              {
                name: "description",
                label: "Description",
                type: "textarea",
              },
            ],
            async onConfirm({ form }) {
              adminPanel.dialog.setLoading(true);
              const { name, description, promptType } = Object.fromEntries(
                form,
              ) as Record<string, string>;
              if (!name || !description) {
                adminPanel.dialog.setLoading(false);
                return {
                  success: false,
                  message: "Name and Description are required.",
                };
              }

              // Fetch the persisted AI provider/model settings
              const settingsRepo = new BUISettingsRepository();
              const aiConfig = await settingsRepo.getActiveAIConfig();

              // Pass promptType to your updated server enhancement action
              const result = await buiAuthorSkillServerEnhanceWithParams(
                name,
                description,
                (promptType ?? "professional") as BUIAuthorSkillPromptType,
                aiConfig,
              );

              adminPanel.form.setFormData({
                ...adminPanel.form.formData,
                name: result.name,
                description: result.description,
              });

              adminPanel.dialog.setLoading(false);
              return { success: true };
            },
          };
          adminPanel.dialog.openDialog(action);
        },
      },
    ],
    query: {
      getAll: async function (
        _options: AdminPanelQueryOptions,
        _overrideOptions?: AdminPanelQueryOptions,
      ): Promise<GetAllResponse<BUIAuthorSkill>> {
        return adminPanelQueryResponseAll({
          data: await buiDatabase.authorSkills.toArray(),
        });
      },
      getOne: async function (
        id: string | number,
      ): Promise<BUIAuthorSkill | undefined> {
        return await buiDatabase.authorSkills.get(Number(id));
      },
    },
    mutation: {
      create: async function (
        data: BUIAuthorSkill,
      ): Promise<AdminPanelResult<BUIAuthorSkill, unknown>> {
        const id = await buiDatabase.authorSkills.add(data);

        return adminPanelResultSuccess<BUIAuthorSkill>(
          (await buiDatabase.authorSkills.get(id)) as BUIAuthorSkill,
        );
      },
      update: async function (
        id: AdminPanelId,
        data: BUIAuthorSkill,
      ): Promise<AdminPanelResult<BUIAuthorSkill, unknown> | undefined> {
        if (typeof id !== "number") {
          throw new Error("Invalid ID type. Expected a number.");
        }

        await buiDatabase.authorSkills.update(id, data);

        return adminPanelResultSuccess<BUIAuthorSkill>(
          (await buiDatabase.authorSkills.get(id)) as BUIAuthorSkill,
        );
      },
      delete: async function (
        iid: AdminPanelId,
      ): Promise<AdminPanelResult<BUIAuthorSkill, unknown> | undefined> {
        const id = Number(iid);

        await buiDatabase.authorSkills.delete(id);

        return adminPanelResultSuccess<BUIAuthorSkill>({} as BUIAuthorSkill);
      },
    },
  };
