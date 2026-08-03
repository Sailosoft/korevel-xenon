// BSInstructionGroup.Repository — Repository for Instruction Groups
//
// Provides select-option helpers on top of PhazeRepository for the Bunny
// form's "select" fields.

import { Table } from "dexie";
import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import { v7 as uuidv7 } from "uuid";
import type { BunnySelectOption } from "@/src/modules/bunny/src/form/BunnyForm.Interface";
import type { BSInstructionGroup } from "./BSInstructionGroup.Types";

export class BSInstructionGroupRepository extends PhazeRepository<BSInstructionGroup> {
  constructor(table: Table<BSInstructionGroup>) {
    super(table);
  }

  /**
   * Create a new instruction group with generated id + createdDate.
   */
  public async createGroup(
    data: Omit<BSInstructionGroup, "id" | "createdDate">,
  ): Promise<BSInstructionGroup> {
    const entity: BSInstructionGroup = {
      id: uuidv7(),
      createdDate: new Date().toISOString(),
      ...data,
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
      .map((g) => ({ label: g.name, value: g.id }));
  }
}
