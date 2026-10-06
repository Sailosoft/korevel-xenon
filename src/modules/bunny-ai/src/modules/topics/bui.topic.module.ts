// bui.topic.module.ts
import React from "react";
import { Sparkles } from "lucide-react";
import { BunnyConfig } from "@/src/modules/bunny/src/Bunny.Interface";
import { BUITopicEntity } from "./bui.topic.entity";
import { BUITopicRepository } from "./bui.topic.repository";
import { buiTopicPrompt } from "./bui.topic.prompt";
import { buiTopicServerGenerate } from "./bui.topic.server";
import { AdminPanelDialogOption } from "@/src/modules/admin-panel/features/dialog/admin-panel-dialog.interface";
import BUISettingsRepository from "../settings/bui.settings.repository";

const repository = new BUITopicRepository();
const settingsRepo = new BUISettingsRepository();

export const buiTopicModule: BunnyConfig<BUITopicEntity, BUITopicEntity> = {
  title: "Topic",
  titlePlural: "Topics",
  rowKey: "id",
  modalSize: "cover",
  onFormSuccess: {
    mode: "closeOnly",
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
        rules: [{ rule: "required", message: "Title is required" }],
      },
      {
        name: "description",
        label: "Description",
        type: "editor",
      },
    ],
  },
  defaultHeaderActions: true,
  headerActions: [
    {
      id: "generate_topic_ai",
      label: "Generate Topic with AI",
      icon: React.createElement(Sparkles),
      variant: "accent",
      onClick: async (context) => {
        const adminPanel = context!.adminPanel;
        const option: AdminPanelDialogOption = {
          title: "Generate Topic with AI",
          message:
            "Describe the topic seed and pick a Generation Type. The AI creates one reusable Topic (title + description).",
          actionId: "generate_topic",
          fields: [
            {
              name: "generationType",
              label: "Generation Type",
              type: "select",
              defaultValue: "guide",
              options: buiTopicPrompt.generateTopic.map((entry) => ({
                label: entry.name,
                value: entry.key,
              })),
            },
            {
              name: "brief",
              label: "Topic brief / seed",
              type: "textarea",
              required: true,
            },
          ],
          onConfirm: async ({ form }) => {
            adminPanel.dialog.setLoading(true);
            const { generationType, brief } = Object.fromEntries(form) as Record<
              string,
              string
            >;

            if (!brief || !brief.trim()) {
              adminPanel.dialog.setLoading(false);
              return {
                success: false,
                message: "A topic brief is required to generate a Topic.",
              };
            }

            try {
              const aiConfig = await settingsRepo.getActiveAIConfig();
              const topic = await buiTopicServerGenerate(
                { brief: brief.trim() },
                generationType ?? "guide",
                aiConfig,
              );

              await repository.panelCreate({
                title: topic.title,
                description: topic.description,
              });

              adminPanel.table.refresh?.();
              return {
                success: true,
                message: `Topic "${topic.title}" generated.`,
              };
            } catch (error) {
              console.error("AI Topic generation failed:", error);
              return {
                success: false,
                message:
                  error instanceof Error
                    ? error.message
                    : "Failed to generate the topic with AI.",
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
