// BDApi.Repository.ts — repositories for API groups and API operations.

import { bdDB } from "../../BDDatabase";
import type { BDAPI, BDApiGroup } from "../../BDDomain.Types";
import { BDRepository, type BDCreateInput } from "../../BDRepository";

export class BDApiRepository extends BDRepository<BDAPI> {
  constructor() {
    super(bdDB.apiSpecs);
  }

  async listByProject(projectId: string): Promise<BDAPI[]> {
    return this.listWhere("projectId", projectId);
  }
}

export class BDApiGroupRepository extends BDRepository<BDApiGroup> {
  constructor() {
    super(bdDB.apiGroups);
  }

  async listByProject(projectId: string): Promise<BDApiGroup[]> {
    const rows = await this.listWhere("projectId", projectId);
    return rows.sort((a, b) => a.position - b.position);
  }

  async createGroup(
    projectId: string,
    name: string,
    description = "",
  ): Promise<BDApiGroup> {
    const existing = await this.listByProject(projectId);
    return this.create({
      projectId,
      name,
      description,
      position: existing.length,
    } as BDCreateInput<BDApiGroup>);
  }
}

export const bdApiRepository = new BDApiRepository();
export const bdApiGroupRepository = new BDApiGroupRepository();
