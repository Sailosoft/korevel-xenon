// BSChatCategory.Repository — Repository for Chat Favorites Categories
//
// Provides create + select-option helpers on top of PhazeRepository for the
// Bunny form "select" fields and the Chat Favorite category picker.

import { Table } from "dexie";
import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import { v7 as uuidv7 } from "uuid";
import type { BunnySelectOption } from "@/src/modules/bunny/src/form/BunnyForm.Interface";
import type { BSChatCategory } from "./BSChatCategory.Types";

/** Option value used to represent "no category / uncategorized". */
export const BS_NO_CATEGORY_OPTION: BunnySelectOption = {
  label: "No category",
  value: "",
};

export class BSChatCategoryRepository extends PhazeRepository<BSChatCategory> {
  constructor(table: Table<BSChatCategory>) {
    super(table);
  }

  /**
   * Create a new chat category with generated id + createdDate.
   */
  public async createCategory(
    data: Omit<BSChatCategory, "id" | "createdDate">,
  ): Promise<BSChatCategory> {
    const entity: BSChatCategory = {
      id: uuidv7(),
      createdDate: new Date().toISOString(),
      ...data,
    };
    await this.set.add(entity);
    return entity;
  }

  /**
   * Build select options (label/value) for Bunny "select" form fields,
   * sorted alphabetically.
   */
  public async toSelectOptions(): Promise<BunnySelectOption[]> {
    const items = await this.set.toArray();
    return items
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => ({ label: c.name, value: c.id }));
  }

  /**
   * Build select options with a leading "No category" option (value = "").
   * Used by the Chat Favorite form so a favorite can be uncategorized.
   */
  public async toOptionsWithNone(): Promise<BunnySelectOption[]> {
    const options = await this.toSelectOptions();
    return [BS_NO_CATEGORY_OPTION, ...options];
  }

  /**
   * All categories sorted by name (used by pickers / filter UIs).
   */
  public async listAll(): Promise<BSChatCategory[]> {
    const items = await this.set.toArray();
    return items.sort((a, b) => a.name.localeCompare(b.name));
  }
}
