// bui.book.module.ts
import React from "react";
import { CircleFadingArrowUp, Download } from "lucide-react";
import {
  BunnyConfig,
  BunnyKernel,
} from "@/src/modules/bunny/src/Bunny.Interface";
import { BUIBookEntity } from "./bui.book.entity";

import { BUIBookRepository } from "./bui.book.repository";
import BUIAuthorRepository from "../authors/bui.author.repository";
import { BunnySelectOption } from "@/src/modules/bunny/src/form/BunnyForm.Interface";
import { AdminPanelDialogOption } from "@/src/modules/admin-panel/features/dialog/admin-panel-dialog.interface";
import { buiBookServerEnhanceWithParams } from "./bui.book.server.enhance";
import { BUIBookPromptType } from "./bui.book.prompt";
import { getBunnyDefaultRowActions } from "@/src/modules/bunny/src/rows/BunnyRow.Action.Default";
import { BookOpenText } from "lucide-react";
import { buiBookExportDownload } from './bui.book.export.download';
const repository = new BUIBookRepository();
const authorRepository = new BUIAuthorRepository();
const defaultBunnyRowAction = getBunnyDefaultRowActions<BUIBookEntity>();

export const buiBookModule: BunnyConfig<BUIBookEntity, BUIBookEntity> = {
  title: "Book",
  titlePlural: "Books",
  rowKey: "id",
  modalSize: "cover",
  columns: [
    {
      field: "title",
      header: "Title",
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
        name: "title",
        label: "Title",
        type: "text",
        rules: [
          {
            rule: "required",
            message: "Title is required",
          },
        ],
      },
      {
        name: "authorId",
        label: "Author",
        type: "select",
        options: async () => {
          const result = await authorRepository.getList({});
          if (result.isSuccess) {
            return result.value.map<BunnySelectOption>((e) => ({
              label: e.name,
              value: e.id as number,
            }));
          }

          throw new Error();
        },
        rules: [
          {
            rule: "required",
            message: "Author is required",
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
  defaultRowActions: false,
  rowActions: [
    {
      id: "chapters",
      variant: "ghost",
      icon: React.createElement(BookOpenText),
      onClick: function (
        row: BUIBookEntity,
        context: BunnyKernel<BUIBookEntity, unknown>,
      ): void | Promise<void> {
        const { router } = context;
        router.push(`/modules/bunny-ai/books/${row.id}`);
      },
    },
    defaultBunnyRowAction.view,
    defaultBunnyRowAction.edit,
    defaultBunnyRowAction.delete,
    {
      id: "instant_download_export",
      variant: "ghost",
      icon: React.createElement(Download),
      onClick: async function (
        row: BUIBookEntity,
        context: BunnyKernel<BUIBookEntity, unknown>,
      ) {
        if (!row.id) return;
        context.adminPanel?.table?.loadingOn?.();
        // Instantly triggers automatic generation via internal compilation rules using base fallback configurations
        await buiBookExportDownload(row.id);
        context.adminPanel?.table?.loadingOff?.();
      },
    },
  ],
  rowActionsColLength: 170,
  modalHeaderActions: [
    {
      id: "enhanced_book",
      label: "Enhance Book With AI",
      icon: React.createElement(CircleFadingArrowUp),
      variant: "default",
      hide: ["view"],
      onClick: async (context) => {
        const { adminPanel } = context!;
        const action: AdminPanelDialogOption = {
          title: "Enhance Book Pitch & Chapters",
          actionId: "enhance",
          fields: [
            {
              name: "promptType",
              label: "AI Framing Pattern",
              type: "select",
              defaultValue: "comprehensive",
              options: [
                {
                  label: "Comprehensive (Description & Chapters)",
                  value: "comprehensive",
                },
                { label: "Commercial / Marketing Pitch", value: "marketing" },
                { label: "Academic / Thesis Abstract", value: "academic" },
                { label: "Cinematic Plot Synopsis", value: "cinematic" },
                { label: "Minimalist Elevator Pitch", value: "minimalist" },
              ],
            },
            {
              name: "title",
              label: "Draft Title",
              type: "text",
            },
            {
              name: "description",
              label: "Core Idea / Raw Concept",
              type: "textarea",
            },
          ],
          async onConfirm({ form }) {
            adminPanel.dialog.setLoading(true);
            const { title, description, promptType } = Object.fromEntries(
              form,
            ) as Record<string, string>;

            if (!title || !description) {
              adminPanel.dialog.setLoading(false);
              return {
                success: false,
                message: "Both Title and Description are required to optimize.",
              };
            }

            try {
              // Fire request to the book module's dedicated server logic
              const result = await buiBookServerEnhanceWithParams(
                title,
                description,
                (promptType ?? "comprehensive") as BUIBookPromptType,
              );

              // Inject the formatted payload back into the active form session
              adminPanel.form.setFormData({
                ...adminPanel.form.formData,
                title: result.title,
                description: result.content, // Maps the structured payload into the rich text editor
              });

              adminPanel.dialog.setLoading(false);
              return { success: true };
            } catch (error) {
              console.error("AI Book Enhancement failed:", error);
              adminPanel.dialog.setLoading(false);
              return {
                success: false,
                message:
                  "An error occurred while processing book concept with AI.",
              };
            }
          },
        };
        adminPanel.dialog.openDialog(action);
      },
    },
  ],
  query: {
    getAll: (options, overrideOptions) =>
      repository.panelGetAll(options, overrideOptions),
    getOne: (id) => repository.panelGetOne(id),
  },
  mutation: {
    create: (data) => repository.panelCreate(data),
    update: (id, data) => repository.panelUpdate(id, data),
    delete: (id) => repository.panelDelete(id),
  },
};
