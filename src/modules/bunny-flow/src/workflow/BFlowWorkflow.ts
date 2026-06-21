import { BunnyFeature } from "@/src/modules/bunny/src/feature/Bunny-Feature";
import { BFlowWorkflowTemplateEntity } from "./BFlowWorkflow.Types";
import { bflowDB } from "../database/BFlowDatabase";
import { useBFlowWorkflowFormValidation } from "../adapters/BFlowZodAdapter";

export const bflowWorkflowModule = BunnyFeature.create<
  BFlowWorkflowTemplateEntity,
  BFlowWorkflowTemplateEntity
>("Workflow", "id", (feature) => {
  // ── SSR-safe configuration (runs on both server and client) ──────────
  feature.setModuleUrl("/modules/bunny-flow/*");
  feature.useDefault();

  // ── Validation adapter ─────────────────────────────────────────────────
  feature.setValidationAdapter(useBFlowWorkflowFormValidation());
  feature.setModalSize("lg");

  feature.configureTable((table) => {
    table.addColumns([
      { field: "id", header: "ID", sortable: true, isRowHeader: true },
      { field: "name", header: "Name", sortable: true },
      { field: "slug", header: "Slug", sortable: true },
      { field: "version", header: "Version", sortable: true },
      { field: "status", header: "Status", sortable: true },
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
        // required: true,
        options: () => bflowDB.definitionsRepo.toSelectOptions(),
      },
      {
        name: "name",
        label: "Name",
        placeholder: "Enter workflow name",
        type: "text",
        // required: true,
      },
      {
        name: "slug",
        label: "Slug",
        type: "slug",
        // required: true,
        slug: { sourceField: "name" },
      },
      {
        name: "description",
        label: "Description",
        placeholder: "Describe the workflow purpose",
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
      {
        name: "templateYaml",
        label: "Template YAML",
        placeholder: "YAML workflow definition",
        type: "code-editor",
        language: "yaml",
        rows: 12,
      },
    ]);
    form.setGridCols(1);
  });

  feature.useDataLayer(bflowDB.workflowTemplatesRepo.dataLayer);
});
