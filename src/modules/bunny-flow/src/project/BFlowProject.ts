import { BunnyConfig } from "@/src/modules/bunny/src/Bunny.Interface";
import { BunnyFeature } from "@/src/modules/bunny/src/feature/Bunny-Feature";
import { BFlowProjectEntity } from "./BFlowProject.Types";
import { bflowDB } from "../database/BFlowDatabase";

export const bflowProject = BunnyFeature.create<
  BFlowProjectEntity,
  BFlowProjectEntity
>("projects", "id", (builder) => {
  const { projectsRepo } = bflowDB;
  builder.useDataLayer({
    query: projectsRepo.query,
    mutation: projectsRepo.mutation,
  });
});
