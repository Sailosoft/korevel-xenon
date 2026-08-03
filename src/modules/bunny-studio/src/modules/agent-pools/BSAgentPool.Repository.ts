// BSAgentPool.Repository — Repository for Bunny AI Studio Agent Pools
//
// Agent pool repository with creation-time defaults.

import { Table } from "dexie";
import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import { v7 as uuidv7 } from "uuid";
import type { BunnySelectOption } from "@/src/modules/bunny/src/form/BunnyForm.Interface";
import type { BSAgentPool } from "./BSAgentPool.Types";

export class BSAgentPoolRepository extends PhazeRepository<BSAgentPool> {
  constructor(table: Table<BSAgentPool>) {
    super(table);
  }

  /**
   * Create a new agent pool with generated id + createdDate.
   */
  public async createPool(pool: Omit<BSAgentPool, "id" | "createdDate">): Promise<BSAgentPool> {
    const entity: BSAgentPool = {
      id: uuidv7(),
      createdDate: new Date().toISOString(),
      ...pool,
    };
    await this.set.add(entity);
    return entity;
  }

  /**
   * Build select options (label/value) for Bunny "select" form fields.
   */
  public async toSelectOptions(): Promise<BunnySelectOption[]> {
    const items = await this.set.toArray();
    return items
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => ({ label: p.name, value: p.id }));
  }
}
