import { BunnyFeature } from "@/src/modules/bunny/src/feature/Bunny-Feature";
import { BFlowDefinitionEntity } from "./BFlowDefinition.Types";
import { bflowDB } from "../database/BFlowDatabase";

export const bflowDefinitionModule = BunnyFeature.create<
  BFlowDefinitionEntity,
  BFlowDefinitionEntity
>("Flow", "id", (feature) => {
  // ── SSR-safe configuration (runs on both server and client) ──────────
  feature.setModuleUrl("/modules/bunny-flow");
  feature.useDefault();
  feature.configureTable((table) => {
    table.addColumns([
      { field: "id", header: "ID", sortable: true, isRowHeader: true },
      { field: "code", header: "Code", sortable: true },
      { field: "name", header: "Name", sortable: true },
      { field: "slug", header: "Slug", sortable: true },
      { field: "status", header: "Status", sortable: true },
      { field: "version", header: "Version", sortable: true },
    ]);
  });

  feature.configureForm((form) => {
    form.setOnSuccess({ mode: "closeOnly" });
    form.addFields([
      {
        name: "code",
        label: "Code",
        placeholder: "Enter unique flow code",
        type: "text",
        required: true,
      },
      {
        name: "name",
        label: "Name",
        placeholder: "Enter flow name",
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
        placeholder: "Describe the flow purpose",
        type: "textarea",
        rows: 4,
      },
      {
        name: "version",
        label: "Version",
        placeholder: "e.g. 1.0.0",
        type: "text",
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        options: [
          { label: "Draft", value: "draft" },
          { label: "Published", value: "published" },
          { label: "Archived", value: "archived" },
        ],
      },
    ]);
    form.setGridCols(2);
  });

  feature.useDataLayer(bflowDB.definitionsRepo.dataLayer);
});
