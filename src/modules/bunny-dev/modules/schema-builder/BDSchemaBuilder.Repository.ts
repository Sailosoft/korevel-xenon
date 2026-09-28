// BDSchemaBuilder.Repository.ts — repositories for schema groups and models.

import { bdDB } from "../../BDDatabase";
import type {
  BDSchemaGroup,
  BDSchemaModel,
  BDSchemaProperty,
} from "../../BDDomain.Types";
import { BDSchemaType } from "../../BDDomain.Types";
import { BDRepository, type BDCreateInput } from "../../BDRepository";
import { slugifyTable } from "./BDSchemaBuilder.Types";

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

  async createModel(
    projectId: string,
    groupId: string,
    name: string,
  ): Promise<BDSchemaModel> {
    const idProperty: BDSchemaProperty = {
      name: "id",
      type: BDSchemaType.uuid,
      nullable: false,
      primary: true,
      unique: true,
    };
    return this.create({
      projectId,
      groupId,
      name,
      table: name.trim() ? slugifyTable(name) : "",
      properties: [idProperty],
      relations: [],
      indexes: [],
      primaryKey: ["id"],
      timestamps: true,
      softDeletes: false,
    } as BDCreateInput<BDSchemaModel>);
  }
}

export const bdSchemaGroupRepository = new BDSchemaGroupRepository();
export const bdSchemaModelRepository = new BDSchemaModelRepository();
