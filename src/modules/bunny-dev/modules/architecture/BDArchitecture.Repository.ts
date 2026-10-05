// BDArchitecture.Repository.ts — architecture repository helpers.

import { bdDB } from "../../BDDatabase";
import type {
  BDArchitectureGroup,
  BDArchitectureRecord,
} from "../../BDDomain.Types";
import { BDRepository, type BDCreateInput } from "../../BDRepository";

export class BDArchitectureRepository extends BDRepository<BDArchitectureRecord> {
  constructor() {
    super(bdDB.architectures);
  }

  async listByProject(projectId: string): Promise<BDArchitectureRecord[]> {
    return this.listWhere("projectId", projectId);
  }

  async listByGroup(groupId: string): Promise<BDArchitectureRecord[]> {
    return this.listWhere("groupId", groupId);
  }
}

export class BDArchitectureGroupRepository extends BDRepository<BDArchitectureGroup> {
  constructor() {
    super(bdDB.architectureGroups);
  }

  async listByProject(projectId: string): Promise<BDArchitectureGroup[]> {
    const rows = await this.listWhere("projectId", projectId);
    return rows.sort((a, b) => a.position - b.position);
  }

  async createGroup(
    projectId: string,
    name: string,
    description = "",
  ): Promise<BDArchitectureGroup> {
    const existing = await this.listByProject(projectId);
    return this.create({
      projectId,
      name,
      description,
      position: existing.length,
    } as BDCreateInput<BDArchitectureGroup>);
  }
}

export const bdArchitectureRepository = new BDArchitectureRepository();
export const bdArchitectureGroupRepository = new BDArchitectureGroupRepository();
