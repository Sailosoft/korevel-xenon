// BDSchemaBuilder.Repository.ts — repositories for schema groups and models.

import { bdDB } from "../../BDDatabase";
import type {
  BDSchemaGroup,
  BDSchemaModel,
} from "../../BDDomain.Types";
import { BDRepository, type BDCreateInput } from "../../BDRepository";

export class BDSchemaGroupRepository extends BDRepository<BDSchemaGroup> {
  constructor() {
    super(bdDB.schemaGroups);
  }

  async listByProject(projectId: string): Promise<BDSchemaGroup[]> {
    const rows = await this.listWhere("projectId", projectId);
    return rows.sort((a, b) => a.position - b.position);
  }

  async createGroup(
    projectId: string,
    name: string,
    description = "",
  ): Promise<BDSchemaGroup> {
    const existing = await this.listByProject(projectId);
    return this.create({
      projectId,
      name,
      description,
      position: existing.length,
    } as BDCreateInput<BDSchemaGroup>);
  }
}

export class BDSchemaModelRepository extends BDRepository<BDSchemaModel> {
  constructor() {
    super(bdDB.schemaModels);
  }

  async listByGroup(groupId: string): Promise<BDSchemaModel[]> {
    const rows = await this.listWhere("groupId", groupId);
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }

  async listByProject(projectId: string): Promise<BDSchemaModel[]> {
    return this.listWhere("projectId", projectId);
  }

  async createFromDraft(draft: BDSchemaModel): Promise<BDSchemaModel> {
    return this.create({
      projectId: draft.projectId,
      groupId: draft.groupId,
      name: draft.name,
      table: draft.table,
      description: draft.description,
      properties: draft.properties,
      relations: draft.relations,
      indexes: draft.indexes,
      primaryKey: draft.primaryKey,
      timestamps: draft.timestamps,
      softDeletes: draft.softDeletes,
    });
  }
}

export const bdSchemaGroupRepository = new BDSchemaGroupRepository();
export const bdSchemaModelRepository = new BDSchemaModelRepository();
