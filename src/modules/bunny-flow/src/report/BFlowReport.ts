import { BunnyFeature } from "@/src/modules/bunny/src/feature/Bunny-Feature";
import { BFlowReportTemplateEntity } from "./BFlowReport.Types";
import { bflowDB } from "../database/BFlowDatabase";

export const bflowReportModule = BunnyFeature.create<
  BFlowReportTemplateEntity,
  BFlowReportTemplateEntity
>("Report", "id", (feature) => {
  // ── SSR-safe configuration (runs on both server and client) ──────────
  feature.setModuleUrl("/modules/bunny-flow/*");
  feature.useDefault();
  feature.configureTable((table) => {
    table.addColumns([
      { field: "id", header: "ID", sortable: true, isRowHeader: true },
      { field: "filename", header: "Filename", sortable: true },
      { field: "workflowId", header: "Workflow", sortable: true },
    ]);
  });

  feature.configureForm((form) => {
    form.setOnSuccess({ mode: "closeOnly" });
    form.addFields([
      {
        name: "workflowId",
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
        name: "filename",
        label: "Filename",
        placeholder: "e.g. report-output.html",
        type: "text",
        required: true,
      },
    ]);
    form.setGridCols(2);
  });

  feature.useDataLayer(bflowDB.reportTemplatesRepo.dataLayer);
});
