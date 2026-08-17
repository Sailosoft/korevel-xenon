// BSKnowledgeGroup.Module — BunnyFeature module for Knowledge Groups.
//
// A knowledge group is a selectable RAG corpus. In chat, the user picks a
// knowledge group so the assistant can answer from its indexed sources. Each
// group can carry a category tag (feature: add category to knowledge group).

import { BunnyFeature } from "@/src/modules/bunny/src/feature/BunnyFeature";
import { bsDB } from "../../BSDatabase";
import type { BSKnowledgeGroup } from "./BSKnowledge.Types";

export const bsKnowledgeGroupModule = BunnyFeature.create<
  BSKnowledgeGroup,
  BSKnowledgeGroup
>("Knowledge Group", "id", (feature) => {
  feature.setModuleUrl("/modules/bunny-studio/knowledge-groups*");
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
        field: "category",
        header: "Category",
        sortable: true,
        render: (row) => row.category || "—",
      },
      {
        field: "description",
        header: "Description",
        sortable: false,
        render: (row) => row.description || "—",
      },
      {
        field: "createdDate",
        header: "Created",
        sortable: true,
        render: (row) => new Date(row.createdDate).toLocaleDateString(),
      },
    ]);
  });

  feature.configureForm((form) => {
    form.setOnSuccess({ mode: "closeOnly" });
    form.addFields([
      {
        name: "name",
        label: "Name",
        placeholder: "e.g. Product Docs",
        type: "text",
        required: true,
      },
      {
        name: "category",
        label: "Category",
        placeholder: "e.g. Support, Engineering, Marketing",
        type: "text",
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

  feature.useDataLayer(bsDB.knowledgeGroupsRepo.dataLayer);
});
