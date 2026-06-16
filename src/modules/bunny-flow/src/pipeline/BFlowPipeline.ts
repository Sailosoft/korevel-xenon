import { BunnyFeature } from "@/src/modules/bunny/src/feature/Bunny-Feature";
import { BFlowPipelineEntity } from "./BFlowPipeline.Types";
import { getBFlowDB } from "../database/BFlowDatabase";

export const bflowPipelineModule = BunnyFeature.create<
  BFlowPipelineEntity,
  BFlowPipelineEntity
>("Pipeline", "id", (feature) => {
  const db = getBFlowDB();
  if (!db) return;

  feature.useDataLayer({
    query: db.pipelinesRepo.query,
    mutation: db.pipelinesRepo.mutation,
  });

  feature.setModuleUrl("/modules/bunny-flow/*");

  feature.configureTable((table) => {
    table.addColumns([
      { field: "id", header: "ID", sortable: true, isRowHeader: true },
      { field: "name", header: "Name", sortable: true },
      { field: "slug", header: "Slug", sortable: true },
      { field: "status", header: "Status", sortable: true },
      { field: "version", header: "Version", sortable: true },
      { field: "createdAt", header: "Created", sortable: true },
    ]);
  });

  feature.configureForm((form) => {
    form.setOnSuccess({ mode: "closeOnly" });
  });
});
