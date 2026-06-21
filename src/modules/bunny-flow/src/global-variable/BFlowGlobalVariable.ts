import { BunnyFeature } from "@/src/modules/bunny/src/feature/BunnyFeature";
import { BFlowGlobalVariableEntity } from "./BFlowGlobalVariable.Types";
import { bflowDB } from "../database/BFlowDatabase";
import { useBFlowGlobalVariableFormValidation } from "../adapters/BFlowZodAdapter";
import { Eye } from "lucide-react";
import { createElement } from "react";

export const bflowGlobalVariableModule = BunnyFeature.create<
  BFlowGlobalVariableEntity,
  BFlowGlobalVariableEntity
>("Global Variable", "id", (feature) => {
  // ── SSR-safe configuration (runs on both server and client) ──────────
  feature.setModuleUrl("/modules/bunny-flow/*");
  feature.useDefault();

  // ── Validation adapter ─────────────────────────────────────────────────
  feature.setValidationAdapter(useBFlowGlobalVariableFormValidation());
  feature.configureTable((table) => {
    table.addColumns([
      { field: "id", header: "ID", sortable: true, isRowHeader: true },
      { field: "name", header: "Name", sortable: true },
      { field: "value", header: "Value", sortable: true },
      { field: "type", header: "Type", sortable: true },
      { field: "group", header: "Group", sortable: true },
      { field: "description", header: "Description" },
      { field: "createdAt", header: "Created", sortable: true },
    ]);
  });

  feature.configureRow((row) => {
    row.addAction({
      id: "open-group",
      icon: createElement(Eye),
      onClick(row, context) {
        context.router.push(
          `/modules/bunny-flow/global-variables/groups/${row.id}`,
        );
      },
    });
  });

  feature.configureForm((form) => {
    form.setOnSuccess({ mode: "closeOnly" });
    form.addFields([
      {
        name: "name",
        label: "Name",
        placeholder: "Enter variable name",
        type: "text",
        required: true,
      },
      {
        name: "value",
        label: "Default Value",
        placeholder: "Enter default value",
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
        name: "group",
        label: "Group",
        placeholder: "e.g. system, env, custom",
        type: "text",
      },
      {
        name: "description",
        label: "Description",
        placeholder: "Describe this global variable",
        type: "textarea",
        rows: 4,
      },
    ]);
    form.setGridCols(2);
  });

  feature.useDataLayer(bflowDB.globalVariablesRepo.dataLayer);
});
