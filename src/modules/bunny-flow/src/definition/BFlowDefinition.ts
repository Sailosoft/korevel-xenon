import { BunnyFeature } from "@/src/modules/bunny/src/feature/Bunny-Feature";
import { BFlowDefinitionEntity } from "./BFlowDefinition.Types";
import { getBFlowDB } from "../database/BFlowDatabase";

export const bflowDefinitionModule = BunnyFeature.create<
  BFlowDefinitionEntity,
  BFlowDefinitionEntity
>("Definition", "id", (feature) => {
  const db = getBFlowDB();
  if (!db) return; // SSR guard — data layer will be set at runtime

  feature.useDataLayer({
    query: db.definitionsRepo.query,
    mutation: db.definitionsRepo.mutation,
  });

  feature.setModuleUrl("/modules/bunny-flow");

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
  });
});
