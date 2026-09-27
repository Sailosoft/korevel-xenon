// BDArchitecture.Repository.ts — architecture repository helpers.

import { bdDB } from "../../BDDatabase";
import type { BDArchitectureRecord } from "../../BDDomain.Types";
import { BDRepository } from "../../BDRepository";

export class BDArchitectureRepository extends BDRepository<BDArchitectureRecord> {
  constructor() {
    super(bdDB.architectures);
  }

  async listByProject(projectId: string): Promise<BDArchitectureRecord[]> {
    return this.listWhere("projectId", projectId);
  }
}

export const bdArchitectureRepository = new BDArchitectureRepository();
