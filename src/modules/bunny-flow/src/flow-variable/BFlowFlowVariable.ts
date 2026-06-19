import { BunnyFeature } from "@/src/modules/bunny/src/feature/Bunny-Feature";
import { BFlowFlowVariableEntity } from "./BFlowFlowVariable.Types";
import { bflowDB } from "../database/BFlowDatabase";
import { useBFlowFlowVariableFormValidation } from "../adapters/BFlowZodAdapter";

export const bflowFlowVariableModule = BunnyFeature.create<
  BFlowFlowVariableEntity,
  BFlowFlowVariableEntity
>("Flow Variable", "id", (feature) => {
  // ── SSR-safe configuration (runs on both server and client) ──────────
  feature.setModuleUrl("/modules/bunny-flow/*");
  feature.useDefault();

  // ── Validation adapter ─────────────────────────────────────────────────
  feature.setValidationAdapter(useBFlowFlowVariableFormValidation());
  feature.configureTable((table) => {
    table.addColumns([
      { field: "id", header: "ID", sortable: true, isRowHeader: true },
      { field: "name", header: "Name", sortable: true },
      { field: "value", header: "Value", sortable: true },
      { field: "type", header: "Type", sortable: true },
      { field: "description", header: "Description" },
      { field: "createdAt", header: "Created", sortable: true },
    ]);
  });

  feature.configureForm((form) => {
    form.setOnSuccess({ mode: "closeOnly" });
    form.addFields([
      {
        name: "groupId",
        label: "Variable Group",
        placeholder: "Select variable group",
        type: "select",
        required: true,
        options: () => bflowDB.variableGroupsRepo.toSelectOptions(),
      },
      {
        name: "name",
        label: "Name",
        placeholder: "Enter variable name",
        type: "text",
        required: true,
      },
      {
        name: "value",
        label: "Value",
        placeholder: "Enter variable value",
        type: "text",
        required: true,
      },
      {
        name: "type",
        label: "Type",
        type: "select",
        required: true,
        options: [
          { label: "Text", value: "text" },
          { label: "Number", value: "number" },
          { label: "Boolean", value: "boolean" },
          { label: "Select", value: "select" },
          { label: "Textarea", value: "textarea" },
        ],
      },
      {
        name: "description",
        label: "Description",
        placeholder: "Describe this variable",
        type: "textarea",
        rows: 4,
      },
    ]);
    form.setGridCols(2);
  });

  feature.useDataLayer(bflowDB.flowVariablesRepo.dataLayer);
});
