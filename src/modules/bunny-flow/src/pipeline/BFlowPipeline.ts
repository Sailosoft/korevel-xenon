import { BunnyFeature } from "@/src/modules/bunny/src/feature/BunnyFeature";
import { BFlowPipelineEntity } from "./BFlowPipeline.Types";
import { bflowDB } from "../database/BFlowDatabase";
import { useBFlowPipelineFormValidation } from "../adapters/BFlowZodAdapter";
import { PlayCircle } from "lucide-react";
import { createElement } from "react";

export const bflowPipelineModule = BunnyFeature.create<
  BFlowPipelineEntity,
  BFlowPipelineEntity
>("Pipeline", "id", (feature) => {
  // ── SSR-safe configuration (runs on both server and client) ──────────
  feature.setModuleUrl("/modules/bunny-flow/*");
  feature.useDefault();

  // ── Validation adapter ─────────────────────────────────────────────────
  feature.setValidationAdapter(useBFlowPipelineFormValidation());
  feature.configureTable((table) => {
    table.addColumns([
      // { field: "id", header: "ID", sortable: true, isRowHeader: true },
      { field: "name", header: "Name", sortable: true, isRowHeader: true },
      { field: "slug", header: "Slug", sortable: true },
      { field: "status", header: "Status", sortable: true },
      { field: "version", header: "Version", sortable: true },
      { field: "createdAt", header: "Created", sortable: true },
    ]);
  });

  feature.configureRow((row) => {
    row.addAction({
      id: "run-pipeline",
      // label: "Run",
      icon: createElement(PlayCircle),
      variant: "primary",
      onClick(row, context) {
        const flowId = (row as BFlowPipelineEntity).flowId;
        if (flowId) {
          // Stay within the flow context
          context.router.push(
            `/modules/bunny-flow/flow/${flowId}/pipeline/${row.id}/run`,
          );
        } else {
          context.router.push(
            `/modules/bunny-flow/pipeline/${row.id}/run`,
          );
        }
      },
    })
  })

  feature.configureForm((form) => {
    form.setOnSuccess({ mode: "closeOnly" });
    form.addFields([
      {
        name: "name",
        label: "Name",
        placeholder: "Enter pipeline name",
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
        placeholder: "Describe the pipeline purpose",
        type: "textarea",
        rows: 4,
      },
      {
        name: "templateId",
        label: "Workflow Template",
        placeholder: "Select workflow template",
        type: "select",
        required: true,
        options: () => bflowDB.workflowTemplatesRepo.toSelectOptions(),
      },
      {
        name: "flowId",
        label: "Flow Definition",
        placeholder: "Select flow definition",
        type: "select",
        required: true,
        options: () => bflowDB.definitionsRepo.toSelectOptions(),
      },
      {
        name: "variableGroupId",
        label: "Variable Group",
        placeholder: "Select variable group",
        type: "select",
        required: true,
        options: () => bflowDB.variableGroupsRepo.toSelectOptions(),
      },
      {
        name: "versionLabel",
        label: "Version Label",
        placeholder: "e.g. v1.0.0",
        type: "text",
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        options: [
          { label: "Running", value: "running" },
          { label: "Completed", value: "completed" },
          { label: "Failed", value: "failed" },
          { label: "Cancelled", value: "cancelled" },
        ],
      },
      {
        name: "prompt",
        label: "Prompt Override",
        placeholder: "Optional prompt that overrides the template prompt",
        type: "textarea",
        rows: 6,
      },
    ]);
    form.setGridCols(2);
  });

  feature.useDataLayer(bflowDB.pipelinesRepo.dataLayer);
});
