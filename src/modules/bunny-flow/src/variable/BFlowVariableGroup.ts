import { BunnyFeature } from "@/src/modules/bunny/src/feature/Bunny-Feature";
import { BFlowVariableGroupEntity } from "./BFlowVariableGroup.Types";
import { bflowDB } from "../database/BFlowDatabase";

export const bflowVariableGroupModule = BunnyFeature.create<
  BFlowVariableGroupEntity,
  BFlowVariableGroupEntity
>("Variable Group", "id", (feature) => {
  // ── SSR-safe configuration (runs on both server and client) ──────────
  feature.setModuleUrl("/modules/bunny-flow/*");
  feature.useDefault();
  feature.configureTable((table) => {
    table.addColumns([
      { field: "id", header: "ID", sortable: true, isRowHeader: true },
      { field: "name", header: "Name", sortable: true },
      { field: "slug", header: "Slug", sortable: true },
      { field: "description", header: "Description", sortable: true },
      { field: "createdAt", header: "Created", sortable: true },
    ]);
  });

  feature.configureForm((form) => {
    form.setOnSuccess({ mode: "closeOnly" });
    form.addFields([
      {
        name: "flowId",
        label: "Flow Definition",
        placeholder: "Select flow definition",
        type: "select",
        required: true,
        options: () => bflowDB.definitionsRepo.toSelectOptions(),
      },
      {
        name: "name",
        label: "Name",
        placeholder: "Enter variable group name",
        type: "text",
        required: true,
      },
      {
        name: "slug",
        label: "Slug",
        placeholder: "Enter URL-safe slug",
        type: "text",
        required: true,
      },
      {
        name: "description",
        label: "Description",
        placeholder: "Describe this variable group",
        type: "textarea",
        rows: 4,
      },
    ]);
    form.setGridCols(2);
  });

  feature.useDataLayer(bflowDB.variableGroupsRepo.dataLayer);
});
