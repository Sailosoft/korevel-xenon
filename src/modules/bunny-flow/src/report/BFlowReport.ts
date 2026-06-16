import { BunnyFeature } from "@/src/modules/bunny/src/feature/Bunny-Feature";
import { BFlowReportTemplateEntity } from "./BFlowReport.Types";
import { getBFlowDB } from "../database/BFlowDatabase";

export const bflowReportModule = BunnyFeature.create<
  BFlowReportTemplateEntity,
  BFlowReportTemplateEntity
>("Report", "id", (feature) => {
  const db = getBFlowDB();
  if (!db) return;

  feature.useDataLayer({
    query: db.reportTemplatesRepo.query,
    mutation: db.reportTemplatesRepo.mutation,
  });

  feature.setModuleUrl("/modules/bunny-flow/*");

  feature.configureTable((table) => {
    table.addColumns([
      { field: "id", header: "ID", sortable: true, isRowHeader: true },
      { field: "filename", header: "Filename", sortable: true },
      { field: "workflowId", header: "Workflow", sortable: true },
    ]);
  });

  feature.configureForm((form) => {
    form.setOnSuccess({ mode: "closeOnly" });
  });
});
