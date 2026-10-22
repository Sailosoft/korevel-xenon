// BDDoc.Repository.ts — doc repository helpers.

import { bdDB } from "../../BDDatabase";
import type { BDDoc } from "../../BDDomain.Types";
import { BDRepository } from "../../BDRepository";

export class BDDocRepository extends BDRepository<BDDoc> {
  constructor() {
    super(bdDB.docs);
  }

  async listByProject(projectId: string): Promise<BDDoc[]> {
    return this.listWhere("projectId", projectId);
  }
}

export const bdDocRepository = new BDDocRepository();
