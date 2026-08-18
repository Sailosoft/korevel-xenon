// BSKnowledge.Repository — Repositories for the Knowledge Base feature.
//
// Provides typed CRUD + query helpers on top of PhazeRepository for the
// `knowledgeGroups`, `knowledges` (and the Orama snapshot `knowledgeIndexes`
// is handled directly in BSKnowledgeBase.Orama). Group select options are
// consumed by the chat settings "Knowledge Base" picker.

import { Table } from "dexie";
import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import { v7 as uuidv7 } from "uuid";
import type { BunnySelectOption } from "@/src/modules/bunny/src/form/BunnyForm.Interface";
import type {
  BSKnowledge,
  BSKnowledgeForm,
  BSKnowledgeGroup,
  BSKnowledgeGroupForm,
} from "./BSKnowledge.Types";

export class BSKnowledgeGroupRepository extends PhazeRepository<BSKnowledgeGroup> {
  constructor(table: Table<BSKnowledgeGroup>) {
    super(table);
  }

  /**
   * Create a new knowledge group with generated id + createdDate.
   */
  public async createGroup(
    data: BSKnowledgeGroupForm,
  ): Promise<BSKnowledgeGroup> {
    const entity: BSKnowledgeGroup = {
      id: uuidv7(),
      createdDate: new Date().toISOString(),
      ...data,
    };
    await this.set.add(entity);
    return entity;
  }

  /**
   * Build select options (label/value) for Bunny "select" form fields and the
   * chat knowledge-base picker, sorted alphabetically.
   */
  public async toSelectOptions(): Promise<BunnySelectOption[]> {
    const items = await this.set.toArray();
    return items
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((g) => ({ label: g.name, value: g.id }));
  }

  /**
   * All groups sorted by name.
   */
  public async listAll(): Promise<BSKnowledgeGroup[]> {
    const items = await this.set.toArray();
    return items.sort((a, b) => a.name.localeCompare(b.name));
  }
}

export class BSKnowledgeRepository extends PhazeRepository<
  BSKnowledge,
  BSKnowledgeForm
> {
  constructor(table: Table<BSKnowledge>) {
    super(table);
  }

  /**
   * Create a new knowledge record with generated id + createdDate.
   */
  public async createKnowledge(
    data: Omit<BSKnowledge, "id" | "createdDate">,
  ): Promise<BSKnowledge> {
    const entity: BSKnowledge = {
      id: uuidv7(),
      createdDate: new Date().toISOString(),
      ...data,
    };
    await this.set.add(entity);
    return entity;
  }

  /**
   * All knowledges belonging to a group, newest first.
   */
  public async listByGroup(groupId: string): Promise<BSKnowledge[]> {
    const items = await this.set.where("knowledgeGroupId").equals(groupId).toArray();
    return items.sort((a, b) => b.createdDate.localeCompare(a.createdDate));
  }

  /**
   * All knowledges across every group, newest first.
   */
  public async listAllNewestFirst(): Promise<BSKnowledge[]> {
    const items = await this.set.toArray();
    return items.sort((a, b) => b.createdDate.localeCompare(a.createdDate));
  }
}
