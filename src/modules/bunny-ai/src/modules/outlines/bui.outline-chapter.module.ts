// bui.outline-chapter.module.ts
import React from "react";
import { Wand2, BookOpenText, Trash2, BookOpenCheck } from "lucide-react";
import {
  BunnyConfig,
  BunnyKernel,
} from "@/src/modules/bunny/src/Bunny.Interface";
import { BUIOutlineItemEntity } from "./bui.outline.entity";
import { BUIOutlineChapterRepository } from "./bui.outline-chapter.repository";
import { AdminPanelDialogOption } from "@/src/modules/admin-panel/features/dialog/admin-panel-dialog.interface";
import BUIOutlineComponentMobileView from "./bui.outline-chapter.component.mobile-view";
import BUIOutlineChapterReadContentModule from "./bui.outline-chapter.read-content";
import BUIOutlineChapterComponentPipeline from "./bui.outline-chapter.component.pipeline";
import BUIOutlineChapterRefine from "./bui.outline-chapter.component.refine";
import BUIOutlineChapterReferenceField from "./bui.outline-chapter.component.reference";
import BUIOutlineComponentGenerate from "./bui.outline.component.generate";
import { openItemGenerateDialog } from "./bui.outline-chapter.component.generate";
import BUIOutlineComponentExportPreview from "./bui.outline.export.component.chapter";

const repository = new BUIOutlineChapterRepository();

export const buiOutlineChapterModule = (
  outlineId: number,
): BunnyConfig<BUIOutlineItemEntity, BUIOutlineItemEntity> => ({
  title: "Item",
  titlePlural: "Items",
  tableMode: "mobile",
  modalSize: "cover",
  tableMobileView: (row) =>
    React.createElement(BUIOutlineComponentMobileView, { row }),
  rowKey: "id",
  columns: [
    { field: "number", header: "#", width: "50px", isRowHeader: true },
    { field: "title", header: "Item Title", sortable: true },
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
      { name: "number", label: "Item Number", type: "number" },
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
      { name: "content", label: "Content", type: "editor" },
      { name: "additionalPrompt", label: "AI Instructions", type: "text" },
      {
        // Control mode only: the component itself decides whether to render.
        name: "referenceIds",
        label: "",
        type: "custom",
        colSpan: 12,
        component: BUIOutlineChapterReferenceField,
      },
    ],
  },
  defaultHeaderActions: true,
  headerActions: [
    {
      label: "",
      render: () =>
        React.createElement(BUIOutlineComponentGenerate, { outlineId }),
    },
    {
      id: "bulk_pipeline_generate",
      label: "Run AI Batch Generation",
      render: (context) =>
        React.createElement(BUIOutlineChapterComponentPipeline, {
          outlineId,
          context: context!,
        }),
    },
    {
      id: "refine_outline",
      label: "Refine Outline",
      render: (context) =>
        React.createElement(BUIOutlineChapterRefine, {
          outlineId,
          context: context!,
        }),
    },
    {
      id: "export_preview_modal_trigger",
      label: "Export Preview",
      render: () =>
        React.createElement(BUIOutlineComponentExportPreview, { outlineId }),
    },
    {
      id: "delete_item_contents",
      label: "Delete Item Contents",
      icon: React.createElement(Trash2),
      variant: "danger",
      displayMode: "collapse",
      onClick: async (context) => {
        const option: AdminPanelDialogOption = {
          title: "Confirm Delete Item Contents",
          message:
            "This clears the written content from every item while retaining metadata (number, title, description, status, AI instructions). This cannot be undone.",
          actionId: "delete_contents",
          onConfirm: async () => {
            try {
              const repo = new BUIOutlineChapterRepository();
              const records = await repo.getItemsByOutline(outlineId);
              if (records.length > 0) {
                await Promise.all(
                  records
                    .filter((record) => record.id)
                    .map((record) =>
                      repo.panelUpdate(record.id!, {
                        ...record,
                        content: "",
                        wordCount: 0,
                        status: "empty" as const,
                      }),
                    ),
                );
              }
              context?.adminPanel?.table?.refresh?.();
              return {
                success: true,
                message: "Item contents cleared. Metadata retained.",
              };
            } catch (error) {
              console.error(error);
              return {
                success: false,
                message: "Failed to clear item contents.",
              };
            }
          },
        };
        context?.adminPanel.dialog.openDialog(option);
      },
    },
    {
      id: "delete_all",
      label: "Delete All Items",
      icon: React.createElement(BookOpenCheck),
      variant: "danger",
      displayMode: "collapse",
      onClick: async (context) => {
        const option: AdminPanelDialogOption = {
          title: "Confirm Delete All",
          message:
            "Are you sure you want to delete all items for this outline? This cannot be undone.",
          actionId: "delete",
          onConfirm: async () => {
            try {
              const repo = new BUIOutlineChapterRepository();
              const records = await repo.getItemsByOutline(outlineId);
              if (records.length > 0) {
                await Promise.all(
                  records.map((record) => repo.delete(record.id!)),
                );
              }
              context?.adminPanel?.table?.refresh?.();
              return {
                success: true,
                message: "All items deleted successfully.",
              };
            } catch (error) {
              console.error(error);
              return {
                success: false,
                message: "Failed to delete items.",
              };
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
      icon: React.createElement(Wand2),
      variant: "primary",
      onClick: async function (
        row: BUIOutlineItemEntity,
        context: BunnyKernel<BUIOutlineItemEntity, unknown>,
      ) {
        await openItemGenerateDialog(row, context);
      },
    },
    {
      id: "read_content",
      icon: React.createElement(BookOpenText),
      variant: "ghost",
      onClick: async function (
        row: BUIOutlineItemEntity,
        context: BunnyKernel<BUIOutlineItemEntity, unknown>,
      ) {
        const content = row.content || "_No content available._";
        const option: AdminPanelDialogOption = {
          title: `Item ${row.number}: ${row.title}`,
          actionId: "read_content",
          contentOnly: true,
          children: React.createElement(BUIOutlineChapterReadContentModule, {
            content,
          }),
          onConfirm: async () => ({ success: true }),
        };
        context.adminPanel.dialog.openDialog(option);
      },
    },
  ],
  modalHeaderActions: [
    {
      id: "write_item_ai",
      label: "Write with AI",
      icon: React.createElement(Wand2),
      hide: ["view"],
      onClick: async (context) => {
        const adminPanel = context!.adminPanel;
        const data = adminPanel.form
          .formData as BUIOutlineItemEntity;
        if (!data?.id) return;
        await openItemGenerateDialog(data, context!);
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
            value: String(outlineId),
          },
        ],
      }),
    getOne: (id) => repository.panelGetOne(id),
  },
  mutation: {
    create: (data) =>
      repository.panelCreate({
        ...data,
        bookId: outlineId,
        status: data.status || "empty",
      }),
    update: (id, data) => repository.panelUpdate(id, data),
    delete: (id) => repository.panelDelete(id),
  },
});
