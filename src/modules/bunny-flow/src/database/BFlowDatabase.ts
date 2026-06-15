import PhazeDB, { IPhazeModelBuilder } from "@/src/modules/phaze/src/PhazeDB";
import { BFlowProjectEntity } from "../project/BFlowProject.Types";
import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";

export class BFlowDatabase extends PhazeDB {
  public projects = this.table<BFlowProjectEntity, string>("projects");
  public projectsRepo = new PhazeRepository(this.projects);

  protected dbName(): string {
    return "BunnyFlowDB";
  }
  protected onModelCreating(model: IPhazeModelBuilder): void {
    model.schema((config) => {
      config.create("projects", (table) => {
        table.index("id");
        table.index("name");
      });
    });
  }
}

export const bflowDB = new BFlowDatabase();
