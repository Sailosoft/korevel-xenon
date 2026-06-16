import { BunnyFeature } from "@/src/modules/bunny/src/feature/Bunny-Feature";
import { BFlowVariableGroupEntity } from "./BFlowVariableGroup.Types";
import { getBFlowDB } from "../database/BFlowDatabase";

export const bflowVariableGroupModule = BunnyFeature.create<
  BFlowVariableGroupEntity,
  BFlowVariableGroupEntity
>("Variable Group", "id", (feature) => {
  const db = getBFlowDB();
  if (!db) return;

  feature.useDataLayer({
    query: db.variableGroupsRepo.query,
    mutation: db.variableGroupsRepo.mutation,
  });

  feature.setModuleUrl("/modules/bunny-flow/*");

  feature.configureTable((table) => {
    table.addColumns([
      { field: "id", header: "ID", sortable: true, isRowHeader: true },
      { field: "name", header: "Name", sortable: true },
      { field: "slug", header: "Slug", sortable: true },
      { field: "description", header: "Description", sortable: true },
      { field: "createdAt", header: "Created", sortable: true },
    ]);
  });

  feature.configureForm((form) => {
    form.setOnSuccess({ mode: "closeOnly" });
  });
});
