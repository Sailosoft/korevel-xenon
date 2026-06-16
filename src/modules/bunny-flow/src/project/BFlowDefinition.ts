import { BunnyConfig } from "@/src/modules/bunny/src/Bunny.Interface";
import { BunnyFeature } from "@/src/modules/bunny/src/feature/Bunny-Feature";
import { BFlowDefinitionEntity } from "./BFlowDefinition.Types";
import { bflowDB } from "../database/BFlowDatabase";

export const bflowDefinition = BunnyFeature.create<
  BFlowDefinitionEntity,
  BFlowDefinitionEntity
>("definitions", "id", (builder) => {
  const { projectsRepo } = bflowDB;
  builder.useDataLayer({
    query: projectsRepo.query,
    mutation: projectsRepo.mutation,
  });
});
