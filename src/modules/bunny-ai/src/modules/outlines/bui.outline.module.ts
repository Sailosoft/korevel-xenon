// bui.outline.module.ts
import React from "react";
import { ListTree, Sparkles, Download } from "lucide-react";
import {
  BunnyConfig,
  BunnyKernel,
} from "@/src/modules/bunny/src/Bunny.Interface";
import { BUIOutlineEntity } from "./bui.outline.entity";
import { BUIOutlineRepository } from "./bui.outline.repository";
import { BUI_OUTLINE_GENERATION_TYPES } from "./bui.outline.prompt";
import { buiOutlineExportDownload } from "./bui.outline.export.download";
import { buiOutlineChapterPromptContent } from "./bui.outline-chapter.prompt.content";
import { buiOutlineServerGenerateDraft } from "./bui.outline.server";
import BUIAuthorRepository from "../authors/bui.author.repository";
import { BUITopicRepository } from "../topics/bui.topic.repository";
import BUISettingsRepository from "../settings/bui.settings.repository";
import { BunnySelectOption } from "@/src/modules/bunny/src/form/BunnyForm.Interface";
import { AdminPanelDialogOption } from "@/src/modules/admin-panel/features/dialog/admin-panel-dialog.interface";

const repository = new BUIOutlineRepository();
const authorRepository = new BUIAuthorRepository();
const topicRepository = new BUITopicRepository();
const settingsRepo = new BUISettingsRepository();

/** Select fields can yield a string; keep the persisted relation ids numeric. */
function toOptionalNumber(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export const buiOutlineModule: BunnyConfig<BUIOutlineEntity, BUIOutlineEntity> =
  {
    title: "Outline",
    titlePlural: "Outlines",
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
      { field: "generationType", header: "Type" },
      { field: "generationMode", header: "Mode" },
      { field: "description", header: "Description" },
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
          name: "authorId",
          label: "Author (optional)",
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
        },
        {
          name: "topicId",
          label: "Topic Selection (optional)",
          type: "select",
          options: async () => {
            const result = await topicRepository.getList({});
            if (result.isSuccess) {
              return result.value.map<BunnySelectOption>((e) => ({
                label: e.title,
                value: e.id as number,
              }));
            }
            throw new Error();
          },
        },
        {
          name: "generationType",
          label: "Generation Type",
          type: "select",
          defaultValue: "guide",
          options: BUI_OUTLINE_GENERATION_TYPES.map((type) => ({
            label: type.name,
            value: type.key,
          })),
        },
        {
          name: "generationMode",
          label: "Generation Mode",
          type: "select",
          defaultValue: "sequential",
          options: buiOutlineChapterPromptContent.modes.map((mode) => ({
            label: mode.label,
            value: mode.key,
          })),
        },
        {
          name: "description",
          label: "Description",
          type: "editor",
          colSpan: 2,
        },
        {
          name: "additionalPrompt",
          label: "Outline AI Instruction",
          type: "textarea",
          rows: 3,
          colSpan: 2,
        },
        {
          name: "minItems",
          label: "Minimum items (optional)",
          type: "number",
        },
        {
          name: "maxItems",
          label: "Maximum items (optional)",
          type: "number",
        },
        {
          name: "minWords",
          label: "Minimum words",
          type: "number",
          defaultValue: 1000,
        },
        {
          name: "maxWords",
          label: "Maximum words",
          type: "number",
          defaultValue: 1500,
        },
      ],
    },
    props: {
      form: {
        initialData: { minWords: 1000, maxWords: 1500 },
      },
    },
    defaultHeaderActions: true,
    headerActions: [
      {
        id: "generate_outline_ai",
        label: "Generate Outline with AI",
        icon: React.createElement(Sparkles),
        variant: "accent",
        onClick: async (context) => {
          const adminPanel = context!.adminPanel;

          // Topic choices; a missing/stale list is non-fatal. Values are strings
          // because the dialog's single Select tracks string keys.
          let topicOptions: { label: string; value: string }[] = [];
          try {
            const topicsResult = await topicRepository.getList({});
            if (topicsResult.isSuccess) {
              topicOptions = topicsResult.value.map((topic) => ({
                label: topic.title,
                value: String(topic.id),
              }));
            }
          } catch (error) {
            console.error("Failed to load topics for outline generation:", error);
          }

          const option: AdminPanelDialogOption = {
            title: "Generate Outline with AI",
            message:
              "Describe the outline seed and pick a Generation Type. Optionally attach a Topic. The AI creates one outline record (title, description, AI instruction).",
            actionId: "generate_outline_draft",
            fields: [
              {
                name: "generationType",
                label: "Generation Type",
                type: "select",
                defaultValue: "guide",
                options: BUI_OUTLINE_GENERATION_TYPES.map((type) => ({
                  label: type.name,
                  value: type.key,
                })),
              },
              {
                name: "topicId",
                label: "Topic",
                type: "select",
                options: topicOptions,
              },
              {
                name: "brief",
                label: "Outline brief / seed",
                type: "textarea",
                required: true,
              },
            ],
            onConfirm: async ({ form }) => {
              adminPanel.dialog.setLoading(true);
              const data = Object.fromEntries(form) as Record<string, string>;

              if (!data.brief || !data.brief.trim()) {
                adminPanel.dialog.setLoading(false);
                return {
                  success: false,
                  message: "An outline brief is required to generate an outline.",
                };
              }

              try {
                const topicId = toOptionalNumber(data.topicId);
                let topic: { title: string; description?: string } | undefined;
                if (topicId != null) {
                  try {
                    const topicRecord = await topicRepository.panelGetOne(topicId);
                    topic = {
                      title: topicRecord.title,
                      description: topicRecord.description,
                    };
                  } catch {
                    console.warn(
                      `Topic ${topicId} could not be found; continuing without it.`,
                    );
                  }
                }

                const aiConfig = await settingsRepo.getActiveAIConfig();
                const draft = await buiOutlineServerGenerateDraft(
                  { brief: data.brief.trim(), topic },
                  data.generationType || "guide",
                  aiConfig,
                );

                await repository.panelCreate({
                  kind: "outline",
                  title: draft.title,
                  description: draft.description,
                  additionalPrompt: draft.additionalPrompt,
                  generationType: data.generationType || "guide",
                  generationMode: "sequential",
                  topicId,
                  minWords: 1000,
                  maxWords: 1500,
                });

                adminPanel.table.refresh?.();
                return {
                  success: true,
                  message: `Outline "${draft.title}" generated.`,
                };
              } catch (error) {
                console.error("AI Outline generation failed:", error);
                return {
                  success: false,
                  message:
                    error instanceof Error
                      ? error.message
                      : "Failed to generate the outline with AI.",
                };
              } finally {
                adminPanel.dialog.setLoading(false);
              }
            },
          };
          adminPanel.dialog.openDialog(option);
        },
      },
    ],
    defaultRowActions: true,
    rowActions: [
      {
        id: "open_outline",
        label: "Open",
        variant: "primary",
        icon: React.createElement(ListTree),
        onClick: function (
          row: BUIOutlineEntity,
          context: BunnyKernel<BUIOutlineEntity, unknown>,
        ): void {
          context.router.push(`/modules/bunny-ai/outlines/${row.id}`);
        },
      },
      {
        id: "instant_download_export",
        variant: "ghost",
        icon: React.createElement(Download),
        onClick: async function (
          row: BUIOutlineEntity,
          context: BunnyKernel<BUIOutlineEntity, unknown>,
        ) {
          if (!row.id) return;
          context.adminPanel?.table?.loadingOn?.();
          // Compiles the outline with the shared Books templates using the
          // default fallback configuration.
          await buiOutlineExportDownload(row.id);
          context.adminPanel?.table?.loadingOff?.();
        },
      },
    ],
    query: {
      getAll: (options, overrideOptions) =>
        repository.panelGetAll(options, overrideOptions),
      getOne: (id) => repository.panelGetOne(id),
    },
    mutation: {
      create: (data) =>
        repository.panelCreate({
          ...data,
          kind: "outline",
          authorId: toOptionalNumber(data.authorId),
          topicId: toOptionalNumber(data.topicId),
          minItems: toOptionalNumber(data.minItems),
          maxItems: toOptionalNumber(data.maxItems),
          minWords: toOptionalNumber(data.minWords) ?? 1000,
          maxWords: toOptionalNumber(data.maxWords) ?? 1500,
          generationType: data.generationType || "guide",
          generationMode: data.generationMode || "sequential",
        }),
      update: (id, data) =>
        repository.panelUpdate(id, {
          ...data,
          kind: "outline",
          authorId: toOptionalNumber(data.authorId),
          topicId: toOptionalNumber(data.topicId),
          minItems: toOptionalNumber(data.minItems),
          maxItems: toOptionalNumber(data.maxItems),
          minWords: toOptionalNumber(data.minWords),
          maxWords: toOptionalNumber(data.maxWords),
        }),
      delete: (id) => repository.panelDelete(id),
    },
  };
