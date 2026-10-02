// BDDiagram.Repository.ts — diagram repository helpers.

import { bdDB } from "../../BDDatabase";
import type { BDDiagramRecord } from "../../BDDomain.Types";
import { BDRepository, type BDCreateInput } from "../../BDRepository";

export class BDDiagramRepository extends BDRepository<BDDiagramRecord> {
  constructor() {
    super(bdDB.diagrams);
  }

  async listByProject(projectId: string): Promise<BDDiagramRecord[]> {
    return this.listWhere("projectId", projectId);
  }

  async createDiagram(input: BDCreateInput<BDDiagramRecord>): Promise<BDDiagramRecord> {
    return this.create(input);
  }
}

export const bdDiagramRepository = new BDDiagramRepository();
