import React from "react";
import { Wand2, BookOpenCheck } from "lucide-react";
import { BunnyConfig } from "@/src/modules/bunny/src/Bunny.Interface";
import { BUIBookChapterEntity } from "./bui.book.entity";
import { BUIBookChapterRepository } from "./bui.book-chapter.repository";
import { buiChapterServerGenerate } from "./bui.book-chapter.server";
import BUIBookChapterComponentGenerate from "./bui.book-chapter.component.generate";
import { AdminPanelDialogOption } from '@/src/modules/admin-panel/features/dialog/admin-panel-dialog.interface';
import BUIBookChapterComponentMobileView from './bui.book-chapter.component.mobile-view';

const repository = new BUIBookChapterRepository();

export const buiBookChapterModule = (
  bookId: number,
): BunnyConfig<BUIBookChapterEntity, BUIBookChapterEntity> => ({
  title: "Chapter",
  titlePlural: "Chapters",
  tableMode: "mobile",
  tableMobileView: (row) => React.createElement(BUIBookChapterComponentMobileView, { row }),
  rowKey: "id",
  columns: [
    { field: "number", header: "#", width: "50px", isRowHeader: true },
    { field: "title", header: "Chapter Title", sortable: true },
    {
      field: "status",
      header: "Status",
      render: (row) => {
        const mapping: Record<string, { label: string; color: string }> = {
          done: { label: "Done", color: "text-success" },
          empty: { label: "Empty", color: "text-default-400" },
          being_generated: { label: "Generating...", color: "text-warning animate-pulse" },
          pending: { label: "Pending", color: "text-primary" },
        };
        const current = row.status || "empty";
        return React.createElement(
          "span",
          { className: `font-medium ${mapping[current].color}` },
          mapping[current].label
        );
      }
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
      render: () => React.createElement(BUIBookChapterComponentGenerate, { bookId }),
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
          message: "Are you sure you want to delete all chapters for this book? This action cannot be undone.",
          actionId: 'delete',
          onConfirm: async () => {
            try {
              const repo = new BUIBookChapterRepository();
              const records = await repo.getChaptersByBook(bookId);

              if (records && records.length > 0) {
                const deletePromises = records.map((record) => repo.delete(record.id!));
                await Promise.all(deletePromises);
              }

              // Return explicit layout expected by AdminPanelFormActionState
              return { success: true, message: "All chapters deleted successfully." };
            } catch (error) {
              console.error(error);
              return { success: false, message: "Failed to delete chapters." };
            }
          }
        }
        context?.adminPanel.dialog.openDialog(option);
      }
    },
  ],
  defaultRowActions: true,
  rowActions: [],
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
          const result = await buiChapterServerGenerate(
            {
              book: { title: data.title, description: data.description },
            },
            "draft",
            false
          );

          adminPanel.form.setFormData({
            ...data,
            content: result.content,
            status: "done",
          });
        } catch (err) {
          console.error(err);
          adminPanel.dialog.setLoading(false);
        }
      },
    },
    {
      id: "ai_bulk_write",
      label: "Write Content via Full Outline",
      icon: React.createElement(BookOpenCheck),
      hide: ["view"],
      onClick: async (context) => {
        const { adminPanel } = context!;
        const data = adminPanel.form.formData;

        const confirmWrite = confirm(
          "Are you sure you want to run AI Generation for this content based on the full chapter outline, metadata, and author profile?",
        );
        if (!confirmWrite) return;

        adminPanel.dialog.setLoading(true);
        try {
          const result = await buiChapterServerGenerate(
            {
              book: {
                title: data.title,
                description: `Full Outline Mode. ${data.description || ""}`,
              }
            },
            "draft",
            true
          );

          adminPanel.form.setFormData({
            ...data,
            content: result.content,
            status: "done",
          });
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