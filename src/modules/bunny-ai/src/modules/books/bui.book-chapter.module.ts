import React from "react";
import { Wand2 } from "lucide-react";
import { BunnyConfig } from "@/src/modules/bunny/src/Bunny.Interface";
import { BUIBookChapterEntity } from "./bui.book.entity";
import { BUIBookChapterRepository } from "./bui.book-chapter.repository";
import { buiChapterServerGenerate } from "./bui.book-chapter.server";

const repository = new BUIBookChapterRepository();

export const buiBookChapterModule = (
  bookId: number,
): BunnyConfig<BUIBookChapterEntity, BUIBookChapterEntity> => ({
  title: "Chapter",
  titlePlural: "Chapters",
  rowKey: "id",
  columns: [
    { field: "number", header: "#", width: "50px", isRowHeader: true },
    { field: "title", header: "Chapter Title", sortable: true },
    { field: "wordCount", header: "Words" },
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
      { name: "description", label: "Summary/Goal", type: "textarea" },
      { name: "content", label: "Chapter Content", type: "editor" },
      { name: "additionalPrompt", label: "AI Instructions", type: "text" },
    ],
  },
  defaultHeaderActions: true,
  headerActions: [],
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
          const result = await buiChapterServerGenerate({
            title: data.title,
            description: data.description,
            additionalPrompt: data.additionalPrompt,
            content: data.content,
          });

          adminPanel.form.setFormData({ ...data, content: result.content });
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
            value: String( bookId),
          },
        ],
      }),
    getOne: (id) => repository.panelGetOne(id),
  },
  mutation: {
    create: (data) => repository.panelCreate({ ...data, bookId }),
    update: (id, data) => repository.panelUpdate(id, data),
    delete: (id) => repository.panelDelete(id),
  },
});
