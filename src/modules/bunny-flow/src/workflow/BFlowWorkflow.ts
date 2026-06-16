import { BunnyFeature } from "@/src/modules/bunny/src/feature/Bunny-Feature";
import { BFlowWorkflowTemplateEntity } from "./BFlowWorkflow.Types";
import { getBFlowDB } from "../database/BFlowDatabase";

export const bflowWorkflowModule = BunnyFeature.create<
  BFlowWorkflowTemplateEntity,
  BFlowWorkflowTemplateEntity
>("Workflow", "id", (feature) => {
  const db = getBFlowDB();
  if (!db) return;

  feature.useDataLayer({
    query: db.workflowTemplatesRepo.query,
    mutation: db.workflowTemplatesRepo.mutation,
  });

  feature.setModuleUrl("/modules/bunny-flow/*");

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
  });
});
