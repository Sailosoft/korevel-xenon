// BDDiagram.Repository.ts — diagram repository helpers.

import { bdDB } from "../../BDDatabase";
import type { BDDiagramGroup, BDDiagramRecord } from "../../BDDomain.Types";
import { BDRepository, type BDCreateInput } from "../../BDRepository";

export class BDDiagramRepository extends BDRepository<BDDiagramRecord> {
  constructor() {
    super(bdDB.diagrams);
  }

  async listByProject(projectId: string): Promise<BDDiagramRecord[]> {
    return this.listWhere("projectId", projectId);
  }

  async listByGroup(groupId: string): Promise<BDDiagramRecord[]> {
    const rows = await this.listWhere("groupId", groupId);
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }

  async createDiagram(input: BDCreateInput<BDDiagramRecord>): Promise<BDDiagramRecord> {
    return this.create(input);
  }
}

export class BDDiagramGroupRepository extends BDRepository<BDDiagramGroup> {
  constructor() {
    super(bdDB.diagramGroups);
  }

  async listByProject(projectId: string): Promise<BDDiagramGroup[]> {
    const rows = await this.listWhere("projectId", projectId);
    return rows.sort((a, b) => a.position - b.position);
  }

  async createGroup(
    projectId: string,
    name: string,
    description = "",
  ): Promise<BDDiagramGroup> {
    const existing = await this.listByProject(projectId);
    return this.create({
      projectId,
      name,
      description,
      position: existing.length,
    } as BDCreateInput<BDDiagramGroup>);
  }
}

export const bdDiagramRepository = new BDDiagramRepository();
export const bdDiagramGroupRepository = new BDDiagramGroupRepository();
