// BSInstructionGroup.Module — BunnyFeature module for Instruction Groups.
//
// Groups saved custom instructions (feature: Custom Instructions).

import { BunnyFeature } from "@/src/modules/bunny/src/feature/BunnyFeature";
import { bsDB } from "../../BSDatabase";
import type { BSInstructionGroup } from "./BSInstructionGroup.Types";

export const bsInstructionGroupModule = BunnyFeature.create<
  BSInstructionGroup,
  BSInstructionGroup
>("Instruction Group", "id", (feature) => {
  feature.setModuleUrl("/modules/bunny-studio/instruction-groups*");
  feature.useDefault();
  feature.configureTable((table) => {
    table.addColumns([
      {
        field: "name",
        header: "Name",
        sortable: true,
        isRowHeader: true,
      },
      {
        field: "description",
        header: "Description",
        sortable: false,
      },
      {
        field: "createdDate",
        header: "Created",
        sortable: true,
        render: (row) =>
          new Date(row.createdDate).toLocaleDateString(),
      },
    ]);
  });

  feature.configureForm((form) => {
    form.setOnSuccess({ mode: "closeOnly" });
    form.addFields([
      {
        name: "name",
        label: "Name",
        placeholder: "e.g. Code Review",
        type: "text",
        required: true,
      },
      {
        name: "description",
        label: "Description",
        placeholder: "Optional description for this group",
        type: "textarea",
        rows: 3,
      },
    ]);
    form.setGridCols(1);
  });

  feature.useDataLayer(bsDB.instructionGroupsRepo.dataLayer);
});
