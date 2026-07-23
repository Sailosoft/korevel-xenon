import { BunnyFeature } from "@/src/modules/bunny/src/feature/BunnyFeature";
import { BFlowVariableGroupEntity } from "./BFlowVariableGroup.Types";
import { bflowDB } from "../database/BFlowDatabase";
import { useBFlowVariableGroupFormValidation } from "../adapters/BFlowZodAdapter";
import { List } from "lucide-react";
import { createElement } from "react";

export const bflowVariableGroupModule = BunnyFeature.create<
  BFlowVariableGroupEntity,
  BFlowVariableGroupEntity
>("Variable Group", "id", (feature) => {
  // ── SSR-safe configuration (runs on both server and client) ──────────
  feature.setModuleUrl("/modules/bunny-flow/*");
  feature.useDefault();

  // ── Validation adapter ─────────────────────────────────────────────────
  feature.setValidationAdapter(useBFlowVariableGroupFormValidation());
  feature.configureTable((table) => {
    table.addColumns([
      { field: "id", header: "ID", sortable: true, isRowHeader: true },
      { field: "name", header: "Name", sortable: true },
      { field: "slug", header: "Slug", sortable: true },
      { field: "description", header: "Description", sortable: true },
      { field: "createdAt", header: "Created", sortable: true },
    ]);
  });

  feature.configureRow((row) => {
    row.addAction({
      id: "open-group",
      icon: createElement(List),
      onClick(row, context) {
        context.router.push(
          `/modules/bunny-flow/flow/${row.flowId}/variables/groups/${row.id}`,
        );
      },
    });
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
        name: "workflowId",
        label: "Workflow Template",
        placeholder: "Select workflow (optional)",
        type: "select",
        required: false,
        options: () => bflowDB.workflowTemplatesRepo.toSelectOptions(),
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
        type: "slug",
        required: true,
        slug: { sourceField: "name" },
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
