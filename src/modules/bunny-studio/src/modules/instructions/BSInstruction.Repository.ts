// BSInstruction.Repository — Repository for Instructions
//
// Provides select-option helpers on top of PhazeRepository for the Bunny
// form's "select" fields.

import { Table } from "dexie";
import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import { v7 as uuidv7 } from "uuid";
import type { BunnySelectOption } from "@/src/modules/bunny/src/form/BunnyForm.Interface";
import type { BSInstruction } from "./BSInstruction.Types";

export class BSInstructionRepository extends PhazeRepository<BSInstruction> {
  constructor(table: Table<BSInstruction>) {
    super(table);
  }

  /**
   * Create a new instruction with generated id + createdDate.
   */
  public async createInstruction(
    data: Omit<BSInstruction, "id" | "createdDate">,
  ): Promise<BSInstruction> {
    const entity: BSInstruction = {
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
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((i) => ({ label: i.title, value: i.id }));
  }
}
