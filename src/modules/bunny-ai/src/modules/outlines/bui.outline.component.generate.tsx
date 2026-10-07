"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { Rocket } from "lucide-react";
import { useBunnyKernel } from "@/src/modules/bunny/src/kernel";
import { AdminPanelDialogOption } from "@/src/modules/admin-panel/features/dialog/admin-panel-dialog.interface";
import { BUIOutlineRepository } from "./bui.outline.repository";
import { BUIOutlineChapterRepository } from "./bui.outline-chapter.repository";
import {
  generateOutlineStructureAction,
  type GenerateOutlineStructureOptions,
} from "./bui.outline.action.content";
import { BUI_OUTLINE_GENERATION_TYPES } from "./bui.outline.prompt";
import { buiAuthorSkillGetAll } from "../author-skills/bui.author-skills.util";
import BUISettingsRepository from "../settings/bui.settings.repository";
import type { BunnySelectOption } from "@/src/modules/bunny/src/form/BunnyForm.Interface";

interface BUIOutlineComponentGenerateProps {
  outlineId: number;
}

export default function BUIOutlineComponentGenerate({
  outlineId,
}: BUIOutlineComponentGenerateProps) {
  const kernel = useBunnyKernel();
  const [existingCount, setExistingCount] = useState(0);
  const [outlineGenerationType, setOutlineGenerationType] = useState("guide");
  const [skillOptions, setSkillOptions] = useState<BunnySelectOption[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const outlineRepo = new BUIOutlineRepository();
        const chapterRepo = new BUIOutlineChapterRepository();
        const [outline, items] = await Promise.all([
          outlineRepo.panelGetOne(outlineId),
          chapterRepo.getItemsByOutline(outlineId),
        ]);
        setExistingCount(items.length);
        // Default the structure framing to the outline's own Generation Type.
        setOutlineGenerationType(outline?.generationType || "guide");

        const skills = await buiAuthorSkillGetAll();
        setSkillOptions(
          skills.map((skill) => ({ label: skill.name, value: skill.name })),
        );
      } catch (error) {
        console.error("Failed to load outline generation context:", error);
      }
    }
    if (outlineId) load();
  }, [outlineId]);

  const openDialog = useCallback(() => {
    const adminPanel = kernel.adminPanel;
    const option: AdminPanelDialogOption = {
      title: "Generate Outline Structure",
      message:
        "The AI generates a summary and a flat list of items. Structure defaults to the outline's Generation Type; override it below if needed.",
      actionId: "generate_outline_structure",
      fields: [
        {
          name: "overrideGeneration",
          label: "Override the outline's Generation Type",
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
          name: "includeTopic",
          label: "Include the selected Topic",
          type: "checkbox",
          defaultValue: "true",
        },
        {
          name: "summaryMode",
          label: "Summary behaviour",
          type: "select",
          defaultValue: "replace",
          options: [
            { label: "Replace existing summary", value: "replace" },
            { label: "Append to existing summary", value: "append" },
          ],
        },
        {
          name: "useAuthorProfile",
          label: "Align structure with Author Profile",
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
        ...(existingCount > 0
          ? ([
              {
                name: "conflictMode",
                label: "Existing items handling",
                type: "select",
                defaultValue: "overwrite",
                options: [
                  {
                    label: `Overwrite (delete ${existingCount} existing)`,
                    value: "overwrite",
                  },
                  { label: "Skip (keep existing)", value: "skip" },
                  { label: "Extend (append after existing)", value: "extend" },
                ],
              },
            ] as NonNullable<AdminPanelDialogOption["fields"]>)
          : []),
      ],
      onConfirm: async ({ form }) => {
        adminPanel.dialog.setLoading(true);
        const data = Object.fromEntries(form) as Record<string, string>;
        const generationType =
          data.overrideGeneration === "true"
            ? data.generationType || outlineGenerationType
            : outlineGenerationType;

        try {
          const options: GenerateOutlineStructureOptions = {
            conflictMode:
              (data.conflictMode as GenerateOutlineStructureOptions["conflictMode"]) ||
              "overwrite",
            includeTopic: data.includeTopic !== "false",
            summaryMode: data.summaryMode === "append" ? "append" : "replace",
            generationType,
            useAuthorProfile: data.useAuthorProfile !== "false",
            useAuthorSkills: data.useAuthorSkills === "true",
            selectedSkillNames: (data.skillNames || "")
              .split(",")
              .map((name) => name.trim())
              .filter(Boolean),
          };

          const settingsRepo = new BUISettingsRepository();
          const aiConfig = await settingsRepo.getActiveAIConfig();

          const result = await generateOutlineStructureAction(
            outlineId,
            options,
            aiConfig,
          );

          adminPanel.table.refresh?.();

          if (result.skipped) {
            return {
              success: true,
              message: "Existing items kept (skip mode).",
            };
          }

          return {
            success: true,
            message: `Outline structure generated with ${result.created} item(s).`,
          };
        } catch (error) {
          console.error("Outline structure generation failed:", error);
          return {
            success: false,
            message:
              error instanceof Error
                ? error.message
                : "Failed to generate the outline structure.",
          };
        } finally {
          adminPanel.dialog.setLoading(false);
        }
      },
    };

    adminPanel.dialog.openDialog(option);
  }, [kernel, outlineId, existingCount, outlineGenerationType, skillOptions]);

  return (
    <Button variant="secondary" onClick={openDialog}>
      <Rocket />
      <span className="hidden sm:inline ml-1">Generate Structure</span>
    </Button>
  );
}
