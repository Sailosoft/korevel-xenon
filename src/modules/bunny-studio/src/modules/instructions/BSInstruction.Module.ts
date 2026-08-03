// BSInstruction.Module — BunnyFeature module for Instructions.
//
// Saved custom instructions that can be prefilled into the chat "instruction"
// input. Optionally belongs to an InstructionGroup (feature: Custom
// Instructions).

import { BunnyFeature } from "@/src/modules/bunny/src/feature/BunnyFeature";
import { bsDB } from "../../BSDatabase";
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
  },
);
