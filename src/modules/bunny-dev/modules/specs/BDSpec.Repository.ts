// BDSpec.Repository.ts — spec repository helpers.

import { bdDB } from "../../BDDatabase";
import type {
  BDSpecGroup,
  BDSpecRecord,
} from "../../BDDomain.Types";
import { BDRepository, type BDCreateInput } from "../../BDRepository";

export class BDSpecRepository extends BDRepository<BDSpecRecord> {
  constructor() {
    super(bdDB.specs);
  }

  async listByProject(projectId: string): Promise<BDSpecRecord[]> {
    return this.listWhere("projectId", projectId);
  }

  async listByGroup(groupId: string): Promise<BDSpecRecord[]> {
    return this.listWhere("groupId", groupId);
  }
}

export class BDSpecGroupRepository extends BDRepository<BDSpecGroup> {
  constructor() {
    super(bdDB.specGroups);
  }

  async listByProject(projectId: string): Promise<BDSpecGroup[]> {
    const rows = await this.listWhere("projectId", projectId);
    return rows.sort((a, b) => a.position - b.position);
  }

  async createGroup(
    projectId: string,
    name: string,
    description = "",
  ): Promise<BDSpecGroup> {
    const existing = await this.listByProject(projectId);
    return this.create({
      projectId,
      name,
      description,
      position: existing.length,
    } as BDCreateInput<BDSpecGroup>);
  }
}

export const bdSpecRepository = new BDSpecRepository();
export const bdSpecGroupRepository = new BDSpecGroupRepository();
