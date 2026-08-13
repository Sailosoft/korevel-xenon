// bui.book.module.ts
import React from "react";
import { CircleFadingArrowUp, CopyPlus, Download } from "lucide-react";
import {
  BunnyConfig,
  BunnyKernel,
} from "@/src/modules/bunny/src/Bunny.Interface";
import { BUIBookEntity } from "./bui.book.entity";

import { BUIBookRepository } from "./bui.book.repository";
import { BUIBookChapterRepository } from "./bui.book-chapter.repository";
import BUIAuthorRepository from "../authors/bui.author.repository";
import { BunnySelectOption } from "@/src/modules/bunny/src/form/BunnyForm.Interface";
import { AdminPanelDialogOption } from "@/src/modules/admin-panel/features/dialog/admin-panel-dialog.interface";
import { buiBookServerEnhanceWithParams } from "./bui.book.server.enhance";
import { getBunnyDefaultRowActions } from "@/src/modules/bunny/src/rows/BunnyRow.Action.Default";
import { BookOpenText } from "lucide-react";
import { buiBookExportDownload } from "./bui.book.export.download";
import BUISettingsRepository from "../settings/bui.settings.repository";
const repository = new BUIBookRepository();
const authorRepository = new BUIAuthorRepository();
const defaultBunnyRowAction = getBunnyDefaultRowActions<BUIBookEntity>();
const settingsRepo = new BUISettingsRepository();

export const buiBookModule: BunnyConfig<BUIBookEntity, BUIBookEntity> = {
  title: "Book",
  titlePlural: "Books",
  rowKey: "id",
  modalSize: "cover",
  onFormSuccess: {
    mode: "redirect",
  },
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
    {
      id: "clone_book",
      label: "Clone Book",
      variant: "ghost",
      icon: React.createElement(CopyPlus),
      onClick: async function (
        row: BUIBookEntity,
        context: BunnyKernel<BUIBookEntity, unknown>,
      ) {
        if (!row.id) return;
        const sourceBookId = row.id;

        const option: AdminPanelDialogOption = {
          title: "Clone Book",
          message: `Create a copy of "${row.title}". You can rename the cloned book and duplicate its chapters.`,
          actionId: "clone_book",
          fields: [
            {
              name: "title",
              label: "New Book Title",
              type: "text",
              defaultValue: `${row.title} (Copy)`,
              required: true,
            },
            {
              name: "includeChapters",
              label: "Duplicate its chapters",
              type: "checkbox",
              defaultValue: "true",
            },
          ],
          onConfirm: async ({ form }) => {
            context.adminPanel.dialog.setLoading(true);
            const formData = Object.fromEntries(form) as Record<
              string,
              string
            >;
            const newTitle = formData.title?.trim();
            const includeChapters = formData.includeChapters !== "false";

            if (!newTitle) {
              context.adminPanel.dialog.setLoading(false);
              return {
                success: false,
                message: "A title is required to clone the book.",
              };
            }

            try {
              const bookRepo = new BUIBookRepository();
              const chapterRepo = new BUIBookChapterRepository();

              // Create the cloned book with the (possibly renamed) title
              const clonedBook = await bookRepo.panelCreate({
                title: newTitle,
                description: row.description,
                category: row.category,
                authorId: row.authorId,
              });

              if (
                clonedBook.status !== "success" ||
                !clonedBook.data?.id
              ) {
                return {
                  success: false,
                  message: "Failed to create the cloned book.",
                };
              }
              const newBookId = clonedBook.data.id;

              let duplicatedCount = 0;
              if (includeChapters) {
                // Duplicate every chapter from the source book into the clone
                const sourceChapters =
                  await chapterRepo.getChaptersByBook(sourceBookId);
                for (const chapter of sourceChapters ?? []) {
                  await chapterRepo.panelCreate({
                    bookId: newBookId,
                    number: chapter.number,
                    title: chapter.title,
                    description: chapter.description,
                    content: chapter.content,
                    additionalPrompt: chapter.additionalPrompt,
                    authorId: chapter.authorId,
                    wordCount: chapter.wordCount,
                    status: chapter.status,
                  });
                  duplicatedCount += 1;
                }
              }

              context.adminPanel.table.refresh?.();
              return {
                success: true,
                message: `Book "${newTitle}" cloned with ${duplicatedCount} duplicated chapter(s).`,
              };
            } catch (error) {
              console.error("Book cloning failed:", error);
              return {
                success: false,
                message: "An error occurred while cloning the book.",
              };
            } finally {
              context.adminPanel.dialog.setLoading(false);
            }
          },
        };

        context.adminPanel.dialog.openDialog(option);
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
  rowActionsColLength: 200,
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
              // Fetch the persisted AI provider/model settings
              const aiConfig = await settingsRepo.getActiveAIConfig();

              // Fire request to the book module's dedicated server logic
              const result = await buiBookServerEnhanceWithParams(
                title,
                description,
                promptType ?? "comprehensive",
                aiConfig,
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
