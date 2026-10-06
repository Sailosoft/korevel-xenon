"use client";

import React from "react";
import { Button } from "@heroui/react";
import { Wand2 } from "lucide-react";
import { useBunnyKernel } from "@/src/modules/bunny/src/kernel";
import { AdminPanelDialogOption } from "@/src/modules/admin-panel/features/dialog/admin-panel-dialog.interface";
import { BUIOutlineItemEntity } from "./bui.outline.entity";
import { BUI_OUTLINE_GENERATION_TYPES } from "./bui.outline.prompt";
import { buiOutlineChapterPromptContent } from "./bui.outline-chapter.prompt.content";
import { generateItemContentAction } from "./bui.outline.action.content";
import { BUIOutlineChapterRepository } from "./bui.outline-chapter.repository";
import { BUIOutlineRepository } from "./bui.outline.repository";
import { buiAuthorSkillGetAll } from "../author-skills/bui.author-skills.util";
import BUISettingsRepository from "../settings/bui.settings.repository";
import type { BunnySelectOption } from "@/src/modules/bunny/src/form/BunnyForm.Interface";

/** Minimal admin-panel surface needed to open the dialog and refresh the table. */
export interface ItemGenerateContext {
  adminPanel: {
    dialog: {
      setLoading: (loading: boolean) => void;
      openDialog: (option: AdminPanelDialogOption) => void;
    };
    table: { refresh?: () => void };
  };
}

/**
 * Builds and opens the per-item content generation dialog. Shared by the
 * table row action and the modal header action.
 */
export async function openItemGenerateDialog(
  row: BUIOutlineItemEntity,
  context: ItemGenerateContext,
) {
  const { adminPanel } = context;

  const skillOptions: BunnySelectOption[] = (await buiAuthorSkillGetAll()).map(
    (skill) => ({ label: skill.name, value: skill.name }),
  );

  const chapterRepo = new BUIOutlineChapterRepository();
  const outlineRepo = new BUIOutlineRepository();
  const [siblings, outline] = await Promise.all([
    row.bookId
      ? chapterRepo.getItemsByOutline(row.bookId)
      : Promise.resolve<BUIOutlineItemEntity[]>([]),
    row.bookId ? outlineRepo.panelGetOne(row.bookId) : Promise.resolve(undefined),
  ]);
  // Default the dialog to the outline's own Generation Type and Mode.
  const outlineGenerationType = outline?.generationType || "guide";
  const outlineGenerationMode = outline?.generationMode || "sequential";

  const referenceOptions: BunnySelectOption[] = siblings
    .filter((item) => item.id != null && item.id !== row.id)
    .sort((a, b) => a.number - b.number)
    .map((item) => ({
      label: `${item.number}. ${item.title}`,
      value: String(item.id),
    }));

  const option: AdminPanelDialogOption = {
    title: `Generate Item ${row.number}`,
    message: `Run AI content writing for "${row.title}". Defaults follow the outline's Generation Type and Generation Mode; override below if needed.`,
    actionId: "item_write",
    fields: [
      {
        name: "overrideGeneration",
        label: "Override the outline's Generation Type / Mode",
        type: "checkbox",
        defaultValue: "false",
      },
      {
        name: "generationType",
        label: "Generation Type",
        type: "select",
        defaultValue: outlineGenerationType,
        showIf: { field: "overrideGeneration" },
        options: BUI_OUTLINE_GENERATION_TYPES.map((type) => ({
          label: type.name,
          value: type.key,
        })),
      },
      {
        name: "generationMode",
        label: "Generation Mode",
        type: "select",
        defaultValue: outlineGenerationMode,
        showIf: { field: "overrideGeneration" },
        options: buiOutlineChapterPromptContent.modes.map((mode) => ({
          label: mode.label,
          value: mode.key,
        })),
      },
      {
        name: "referencing",
        label: "Control mode: reference sibling/prior context",
        type: "checkbox",
        defaultValue: "true",
        showIf: { field: "generationMode", value: "control" },
      },
      {
        name: "referenceIds",
        label: "Control mode: items to reference (none = all)",
        type: "select",
        multiple: true,
        showIf: { field: "generationMode", value: "control" },
        options: referenceOptions,
      },
      {
        name: "includeTopic",
        label: "Include the selected Topic",
        type: "checkbox",
        defaultValue: "true",
      },
      {
        name: "useAuthorProfile",
        label: "Align writing with Author Profile",
        type: "checkbox",
        defaultValue: "true",
      },
      {
        name: "useAuthorSkills",
        label: "Include Author Skills",
        type: "checkbox",
        defaultValue: "false",
      },
      {
        name: "skillNames",
        label: "Select Skills to Include",
        type: "select",
        multiple: true,
        showIf: { field: "useAuthorSkills" },
        options: skillOptions,
      },
    ],
    onConfirm: async ({ form }) => {
      const data = Object.fromEntries(form) as Record<string, string>;
      const useOverride = data.overrideGeneration === "true";
      const generationType = useOverride
        ? data.generationType || outlineGenerationType
        : outlineGenerationType;
      const generationMode = useOverride
        ? data.generationMode || outlineGenerationMode
        : outlineGenerationMode;

      adminPanel.dialog.setLoading(true);
      try {
        const settingsRepo = new BUISettingsRepository();
        const aiConfig = await settingsRepo.getActiveAIConfig();
        await generateItemContentAction(
          row.id!,
          generationMode,
          aiConfig,
          {
            generationType,
            includeTopic: data.includeTopic !== "false",
            useAuthorProfile: data.useAuthorProfile !== "false",
            useAuthorSkills: data.useAuthorSkills === "true",
            selectedSkillNames: (data.skillNames || "")
              .split(",")
              .map((name) => name.trim())
              .filter(Boolean),
            referencing: data.referencing !== "false",
            referencedIds: (data.referenceIds || "")
              .split(",")
              .map((value) => Number(value.trim()))
              .filter((value) => Number.isFinite(value)),
          },
        );
        adminPanel.table.refresh?.();
        return {
          success: true,
          message: "Item content generated and saved.",
        };
      } catch (err) {
        console.error(err);
        return {
          success: false,
          message:
            err instanceof Error
              ? err.message
              : "Failed to generate item content.",
        };
      } finally {
        adminPanel.table.refresh?.();
        adminPanel.dialog.setLoading(false);
      }
    },
  };

  adminPanel.dialog.openDialog(option);
}

interface BUIOutlineChapterComponentGenerateProps {
  row: BUIOutlineItemEntity;
}

export default function BUIOutlineChapterComponentGenerate({
  row,
}: BUIOutlineChapterComponentGenerateProps) {
  const kernel = useBunnyKernel();

  return (
    <Button
      variant="secondary"
      onClick={() => {
        void openItemGenerateDialog(row, {
          adminPanel: kernel.adminPanel as ItemGenerateContext["adminPanel"],
        });
      }}
    >
      <Wand2 />
      <span className="hidden sm:inline ml-1">Write with AI</span>
    </Button>
  );
}
