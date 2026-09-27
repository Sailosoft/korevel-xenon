// BDOutline.Repository.ts — outline repository helpers.

import { bdDB } from "../../BDDatabase";
import type { BDOutline } from "../../BDDomain.Types";
import { BDRepository } from "../../BDRepository";

export class BDOutlineRepository extends BDRepository<BDOutline> {
  constructor() {
    super(bdDB.outlines);
  }

  async listByProject(projectId: string): Promise<BDOutline[]> {
    return this.listWhere("projectId", projectId);
  }
}

export const bdOutlineRepository = new BDOutlineRepository();
