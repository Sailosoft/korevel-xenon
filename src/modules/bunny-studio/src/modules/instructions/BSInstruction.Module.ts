// BSInstruction.Module — BunnyFeature module for Instructions.
//
// Saved custom instructions that can be prefilled into the chat "instruction"
// input. Optionally belongs to an InstructionGroup (feature: Custom
// Instructions).

import { createElement } from "react";
import { Sparkles } from "lucide-react";
import { BunnyFeature } from "@/src/modules/bunny/src/feature/BunnyFeature";
import { createBunnyHelixAction } from "@/src/modules/bunny-helix";
import { bsDB } from "../../BSDatabase";
import { BS_AI_SETTINGS_ID } from "../ai-settings/BSAISettings.Types";
import type { BSInstruction } from "./BSInstruction.Types";

export const bsInstructionModule = BunnyFeature.create<BSInstruction, BSInstruction>(
  "Instruction",
  "id",
  (feature) => {
    feature.setModuleUrl("/modules/bunny-studio/instructions*");
    feature.useDefault();

    feature.configureTable((table) => {
      table.addColumns([
        {
          field: "title",
          header: "Title",
          sortable: true,
          isRowHeader: true,
        },
        {
          field: "instructionGroupId",
          header: "Group",
          sortable: true,
          mapping: {
            getRecords: async (): Promise<Record<string, unknown>[]> => {
              const res = await bsDB.instructionGroupsRepo.query.getAll({
                page: 0,
                pageSize: 0,
              });
              return res.data as unknown as Record<string, unknown>[];
            },
            key: "id",
            label: "name",
            fallback: "—",
          },
        },
        {
          field: "content",
          header: "Instruction",
          sortable: false,
          render: (row) =>
            row.content.length > 80
              ? `${row.content.slice(0, 80)}…`
              : row.content,
        },
      ]);
    });

    feature.configureForm((form) => {
      form.setOnSuccess({ mode: "closeOnly" });
      form.addFields([
        {
          name: "title",
          label: "Title",
          placeholder: "e.g. Summarize with citations",
          type: "text",
          required: true,
        },
        {
          name: "instructionGroupId",
          label: "Instruction Group",
          placeholder: "Select a group (optional)",
          type: "select",
          required: false,
          options: () => bsDB.instructionGroupsRepo.toSelectOptions(),
        },
        {
          name: "content",
          label: "Instruction Content",
          placeholder: "The instruction text to prefill into chat…",
          type: "textarea",
          required: true,
          rows: 6,
        },
      ]);
      form.setGridCols(1);
    });

    feature.useDataLayer(bsDB.instructionsRepo.dataLayer);

    // ── "AI Create" header action (bunny-helix) ──────────────────────────
    // Plug-and-play: createBunnyHelixAction is a plain factory callable right
    // here at module scope. It opens a modal; the AI generates title + content
    // from a brief and prefills the create form. The provider/model comes from
    // the aiSettings singleton, resolved fresh at submit time.
    feature.configureHeader((header) => {
      header.addAction(
        createBunnyHelixAction<BSInstruction, BSInstruction>({
          id: "ai-create",
          label: "AI Create",
          icon: createElement(Sparkles, { className: "size-4" }),
          variant: "accent",
          ai: async () => {
            const res = await bsDB.aiSettingsRepo.get(BS_AI_SETTINGS_ID);
            if (!res.isSuccess || !res.value.provider || !res.value.model) {
              return undefined;
            }
            return { provider: res.value.provider, model: res.value.model };
          },
          inputFields: [
            {
              name: "brief",
              label: "Describe the instruction",
              type: "textarea",
              required: true,
              rows: 4,
            },
          ],
          modes: {
            label: "Mode",
            field: "mode",
            modes: [
              {
                label: "Simple Instruction",
                mode: "simple-instruction",
                prompt: "Generate a short, simple instruction (1-2 sentences).",
              },
              {
                label: "Detailed Instruction",
                mode: "detailed-instruction",
                default: true,
                prompt:
                  "Generate a detailed, step-by-step instruction with clear structure.",
              },
            ],
          },
          targets: [
            {
              field: "title",
              prompt: "A short, specific title (max ~60 chars).",
            },
            {
              field: "content",
              prompt:
                "The complete instruction text: imperative, precise, ready to paste into a prompt box.",
            },
          ],
          onCreate: "prefill",
          modalTitle: "AI Create Instruction",
          submitLabel: "Generate",
        }),
      );
    });
  },
);