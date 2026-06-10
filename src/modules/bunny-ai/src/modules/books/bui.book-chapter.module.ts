// bui.book-chapter.module.ts
import React from "react";
import { Wand2, BookOpenCheck, BookOpenText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import {
  BunnyConfig,
  BunnyKernel,
} from "@/src/modules/bunny/src/Bunny.Interface";
import { BUIBookChapterEntity } from "./bui.book.entity";
import { BUIBookChapterRepository } from "./bui.book-chapter.repository";
import { BUIBookRepository } from "./bui.book.repository";
import BUIAuthorRepository from "../authors/bui.author.repository";

import { BUIChapterPromptContypeType } from "./bui.book-chapter.prompt.content";
import { AdminPanelDialogOption } from "@/src/modules/admin-panel/features/dialog/admin-panel-dialog.interface";
import BUIBookChapterComponentMobileView from "./bui.book-chapter.component.mobile-view";
import BUIBookChapterComponentGenerate from "./bui.book-chapter.component.generate";
import BUIBookChapterComponentPipeline from "./bui.book-chapter.component.pipeline"; // Imported Pipeline Component
import { generateChapterContentAction } from "./bui.book-chapter.action.content";
import { buiChapterServerContent } from "./bui.book-chapter.server.content";
import BUIBookComponentExportPreview from "./bui.book.export.component.chapter";
import BUISettingsRepository from "../settings/bui.settings.repository";

const repository = new BUIBookChapterRepository();

export const buiBookChapterModule = (
  bookId: number,
): BunnyConfig<BUIBookChapterEntity, BUIBookChapterEntity> => ({
  title: "Chapter",
  titlePlural: "Chapters",
  tableMode: "mobile",
  modalSize: "cover",
  tableMobileView: (row) =>
    React.createElement(BUIBookChapterComponentMobileView, { row }),
  rowKey: "id",
  columns: [
    { field: "number", header: "#", width: "50px", isRowHeader: true },
    { field: "title", header: "Chapter Title", sortable: true },
    {
      field: "status",
      header: "Status",
      render: (row) => {
        const mapping: Record<string, { label: string; color: string }> = {
          done: { label: "Done", color: "text-success font-semibold" },
          empty: { label: "Empty", color: "text-default-400" },
          being_generated: {
            label: "Generating...",
            color: "text-warning animate-pulse font-medium",
          },
          pending: { label: "Pending", color: "text-primary" },
        };
        const current = row.status || "empty";
        return React.createElement(
          "span",
          { className: mapping[current].color },
          mapping[current].label,
        );
      },
    },
    { field: "wordCount", header: "Words" },
    { field: "description", header: "Description" },
  ],
  formConfig: {
    fields: [
      { name: "number", label: "Chapter Number", type: "number" },
      {
        name: "title",
        label: "Title",
        type: "text",
        rules: [{ rule: "required", message: "Title is required" }],
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        options: [
          { label: "Empty", value: "empty" },
          { label: "Pending", value: "pending" },
          { label: "Being Generated", value: "being_generated" },
          { label: "Done", value: "done" },
        ],
      },
      { name: "description", label: "Summary/Goal", type: "textarea" },
      { name: "content", label: "Chapter Content", type: "editor" },
      { name: "additionalPrompt", label: "AI Instructions", type: "text" },
    ],
  },
  defaultHeaderActions: true,
  headerActions: [
    {
      label: "",
      render: () =>
        React.createElement(BUIBookChapterComponentGenerate, { bookId }),
    },
    // --- PIPELINE ENGINE COMPONENT HOOKED HERE ---
    {
      id: "bulk_pipeline_generate",
      label: "Run AI Batch Generation",
      render: (context) =>
        React.createElement(BUIBookChapterComponentPipeline, {
          bookId,
          context: context!,
        }),
    },
    {
      id: "export_preview_modal_trigger",
      label: "Export Preview",
      render: () =>
        React.createElement(BUIBookComponentExportPreview, { bookId }),
    },
    {
      id: "delete_all",
      label: "Delete All Chapters",
      icon: React.createElement(BookOpenCheck),
      variant: "danger",
      displayMode: "collapse",
      onClick: async (context) => {
        const option: AdminPanelDialogOption = {
          title: "Confirm Delete All",
          message:
            "Are you sure you want to delete all chapters for this book? This action cannot be undone.",
          actionId: "delete",
          onConfirm: async () => {
            try {
              const repo = new BUIBookChapterRepository();
              const records = await repo.getChaptersByBook(bookId);

              if (records && records.length > 0) {
                const deletePromises = records.map((record) =>
                  repo.delete(record.id!),
                );
                await Promise.all(deletePromises);
              }
              return {
                success: true,
                message: "All chapters deleted successfully.",
              };
            } catch (error) {
              console.error(error);
              return { success: false, message: "Failed to delete chapters." };
            }
          },
        };
        context?.adminPanel.dialog.openDialog(option);
      },
    },
  ],
  defaultRowActions: true,
  rowActions: [
    {
      id: "generate_content",
      // label: "Write with AI",
      icon: React.createElement(Wand2),
      variant: "primary",
      onClick: async function (
        row: BUIBookChapterEntity,
        context: BunnyKernel<BUIBookChapterEntity, unknown>,
      ) {
        const option: AdminPanelDialogOption = {
          title: `Generate Chapter ${row.number}`,
          message: `Are you sure you want to run live prompt content writing for "${row.title}"?`,
          actionId: "row_write",
          fields: [
            {
              name: "promptType",
              label: "Persona Framing",
              type: "select",
              defaultValue: "default",
              options: [
                { label: "Default Architect", value: "default" },
                { label: "Character-Driven", value: "character_driven" },
                {
                  label: "Software Engineering",
                  value: "software_engineering",
                },
                { label: "Technology", value: "technology" },
                { label: "Medical", value: "medical" },
                { label: "Motivational", value: "motivational" },
              ],
            },
          ],
          onConfirm: async ({ form }) => {
            const { promptType } = Object.fromEntries(form) as Record<
              string,
              string
            >;
            context.adminPanel.dialog.setLoading(true);
            try {
              const settingsRepo = new BUISettingsRepository();
              const aiConfig = await settingsRepo.getActiveAIConfig();
              await generateChapterContentAction(
                row.id!,
                promptType as BUIChapterPromptContypeType,
                aiConfig,
              );
              context.adminPanel.table.refresh?.();
              return {
                success: true,
                message: "Chapter content generated and saved successfully.",
              };
            } catch (err) {
              console.error(err);
              return {
                success: false,
                message: "Failed to create chapter text via pipeline.",
              };
            } finally {
              context.adminPanel.table.refresh?.();
              context.adminPanel.dialog.setLoading(false);
            }
          },
        };
        context.adminPanel.dialog.openDialog(option);
      },
    },
    {
      id: "read_content",
      icon: React.createElement(BookOpenText),
      variant: "ghost",
      onClick: async function (
        row: BUIBookChapterEntity,
        context: BunnyKernel<BUIBookChapterEntity, unknown>,
      ) {
        const content = row.content || "_No content available._";
        const option: AdminPanelDialogOption = {
          title: `Chapter ${row.number}: ${row.title}`,
          actionId: "read_content",
          contentOnly: true,
          children: React.createElement(
            "div",
            {
              className:
                "text-sm leading-relaxed space-y-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-semibold [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:border-default-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-default-600 [&_code]:bg-default-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_pre]:bg-default-100 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_a]:text-primary [&_a]:underline [&_img]:rounded-lg [&_img]:max-w-full [&_hr]:my-6 [&_hr]:border-default-200",
            },
            React.createElement(ReactMarkdown, { children: content }),
          ),
          onConfirm: async () => ({ success: true }),
        };
        context.adminPanel.dialog.openDialog(option);
      },
    },
  ],
  modalHeaderActions: [
    {
      id: "ai_write",
      label: "Write with AI",
      icon: React.createElement(Wand2),
      hide: ["view"],
      onClick: async (context) => {
        const { adminPanel } = context!;
        adminPanel.dialog.setLoading(true);
        const data = adminPanel.form.formData;

        try {
          const bookRepo = new BUIBookRepository();
          const chapterRepo = new BUIBookChapterRepository();
          const authorRepo = new BUIAuthorRepository();

          const [book, allChapters] = await Promise.all([
            bookRepo.panelGetOne(bookId),
            chapterRepo.getChaptersByBook(bookId),
          ]);

          let authorName = "Expert Professional";
          let authorDesc = "Experienced writer.";

          if (book?.authorId) {
            const authorResult = await authorRepo.getList({});
            if (authorResult.isSuccess) {
              const matchingAuthor = authorResult.value.find(
                (a) => a.id === book.authorId,
              );
              if (matchingAuthor) {
                authorName = matchingAuthor.name;
                authorDesc = matchingAuthor.description || "";
              }
            }
          }

          const params = {
            author: { name: authorName, description: authorDesc },
            book: {
              title: book?.title || "Untitled Book",
              chapters: allChapters.map((c) => ({
                number: c.number,
                title: c.title,
                description: c.description || "",
              })),
            },
            currentChapter: {
              number: Number(data.number || 0),
              title: data.title || "",
              description: data.description || "",
              additionalPrompt: data.additionalPrompt || "",
            },
          };

          const settingsRepo = new BUISettingsRepository();
          const aiConfig = await settingsRepo.getActiveAIConfig();
          const result = await buiChapterServerContent(
            params,
            "default",
            aiConfig,
          );

          if (result && result.success) {
            const words = result.content
              ? result.content.split(/\s+/).filter(Boolean).length
              : 0;
            adminPanel.form.setFormData({
              ...data,
              content: result.content,
              wordCount: words,
              status: "done",
            });
          }
        } catch (err) {
          console.error("Modal compilation failed:", err);
        } finally {
          adminPanel.dialog.setLoading(false);
        }
      },
    },
  ],
  query: {
    getAll: (options) =>
      repository.panelGetAll({
        ...options,
        filter: [
          {
            field: "bookId",
            value: String(bookId),
          },
        ],
      }),
    getOne: (id) => repository.panelGetOne(id),
  },
  mutation: {
    create: (data) =>
      repository.panelCreate({
        ...data,
        bookId,
        status: data.status || "empty",
      }),
    update: (id, data) => repository.panelUpdate(id, data),
    delete: (id) => repository.panelDelete(id),
  },
});
