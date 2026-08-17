import { BunnyConfig } from "@/src/modules/bunny/src/Bunny.Interface";
import { BUIAuthor, BUIAuthorFormData } from "./bui.author.entity";
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
import { buiAuthorServerEnhanceWithParams } from "./bui.author.server.enhance";
import { buiContainer } from "../../container/bui.container";
import { AdminPanelDialogOption } from "@/src/modules/admin-panel/features/dialog/admin-panel-dialog.interface";
import BUISettingsRepository from "../settings/bui.settings.repository";
import BUIAuthorSkillAttachField from "../author-skills/bui.author-skills.attach-field.component";
import { buiAuthorSkillAttachSelectedToAuthor } from "../author-skills/bui.author-skills.util";

export const buiAuthorModule: BunnyConfig<BUIAuthor, BUIAuthor> = {
  title: "Author",
  titlePlural: "Authors",
  rowKey: "id",
  onFormSuccess: {
    mode: "closeOnly",
  },
  columns: [
    {
      field: "name",
      header: "Name",
      sortable: true,
      isRowHeader: true,
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
      {
        // Available while creating, updating, or viewing an author. Opens a
        // pop-up to select skills (database + default constants) and shows the
        // chosen skills as bubbles.
        name: "skillNames",
        label: "Preselect Skills",
        type: "custom",
        component: BUIAuthorSkillAttachField,
        modes: ["create", "update", "view"],
        colSpan: 12,
      },
    ],
  },
  defaultHeaderActions: true,
  headerActions: [
    // {
    //   id: 'enhanced',
    //   label: 'Enhanced',
    //   icon: React.createElement(CircleFadingArrowUp),
    //   onClick: (kernel) => {
    //     console.log(kernel?.panel.table.selection);
    //   }
    // }
  ],
  defaultRowActions: true,
  modalHeaderActions: [
    {
      id: "enhanced",
      label: "Enhanced Author With AI",
      icon: React.createElement(CircleFadingArrowUp),
      variant: "default",
      hide: ["view"],
      onClick: async (context) => {
        const { adminPanel } = context!;
        const action: AdminPanelDialogOption = {
          title: "Enhance Author Profile with AI",
          actionId: "enhance",
          fields: [
            {
              name: "promptType",
              label: "AI Tone Style",
              type: "select", // Matches the select block in your FieldRenderer
              defaultValue: "professional",
              options: [
                { label: "Professional Bio", value: "professional" },
                { label: "Creative Narrative", value: "creative" },
                { label: "Short Blurb / Summary", value: "short" },
                { label: "Basic", value: "basic" },
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
            const result = await buiAuthorServerEnhanceWithParams(
              name,
              description,
              promptType ?? "professional",
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
    ): Promise<GetAllResponse<BUIAuthor>> {
      return adminPanelQueryResponseAll({
        data: await buiDatabase.authors.toArray(),
      });
    },
    getOne: async function (
      id: string | number,
    ): Promise<BUIAuthor | undefined> {
      return await buiDatabase.authors.get(Number(id));
    },
  },
  mutation: {
    create: async function (
      data: BUIAuthor,
    ): Promise<AdminPanelResult<BUIAuthor, unknown>> {
      // `skillNames` is a transient form selection (not persisted on the row).
      const { skillNames, ...authorData } = data as BUIAuthorFormData;
      const id = await buiDatabase.authors.add(authorData);

      // Attach only the explicitly chosen skills — nothing is preselected.
      if (Array.isArray(skillNames) && skillNames.length > 0) {
        try {
          await buiAuthorSkillAttachSelectedToAuthor(id, skillNames);
        } catch (error) {
          console.error("Failed to attach skills for author:", error);
        }
      }

      return adminPanelResultSuccess<BUIAuthor>(
        (await buiDatabase.authors.get(id)) as BUIAuthor,
      );
    },
    update: async function (
      id: AdminPanelId,
      data: BUIAuthor,
    ): Promise<AdminPanelResult<BUIAuthor, unknown> | undefined> {
      if (typeof id !== "number") {
        throw new Error("Invalid ID type. Expected a number.");
      }

      // `skillNames` is a transient form selection (not persisted on the row).
      const { skillNames, ...authorData } = data as BUIAuthorFormData;
      await buiDatabase.authors.update(id, authorData);

      // When the user confirmed a skill selection, sync the author's relations.
      if (Array.isArray(skillNames)) {
        try {
          await buiAuthorSkillAttachSelectedToAuthor(id, skillNames);
        } catch (error) {
          console.error("Failed to update author skills:", error);
        }
      }

      return adminPanelResultSuccess<BUIAuthor>(
        (await buiDatabase.authors.get(id)) as BUIAuthor,
      );
    },
    delete: async function (
      iid: AdminPanelId,
    ): Promise<AdminPanelResult<BUIAuthor, unknown> | undefined> {
      const id = Number(iid);
      await buiDatabase.authors.delete(id);

      return adminPanelResultSuccess<BUIAuthor>(
        (await buiDatabase.authors.get(id)) as BUIAuthor,
      );
    },
  },
};
