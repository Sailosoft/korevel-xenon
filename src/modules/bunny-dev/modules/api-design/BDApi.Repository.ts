// BDApi.Repository.ts — API spec repository helpers.

import { bdDB } from "../../BDDatabase";
import type { BDAPI } from "../../BDDomain.Types";
import { BDRepository } from "../../BDRepository";

export class BDApiRepository extends BDRepository<BDAPI> {
  constructor() {
    super(bdDB.apiSpecs);
  }

  async listByProject(projectId: string): Promise<BDAPI[]> {
    return this.listWhere("projectId", projectId);
  }
}

export const bdApiRepository = new BDApiRepository();
