// BSChatFavorite.Repository — Repository for Chat Favorites
//
// Adds chat-aware helpers (create/update by chat, lookup, remove) on top of
// PhazeRepository so the Chat History "Favorite" flow stays simple.

import { Table } from "dexie";
import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import { v7 as uuidv7 } from "uuid";
import type { BSChatFavorite } from "./BSChatFavorite.Types";

export class BSChatFavoriteRepository extends PhazeRepository<BSChatFavorite> {
  constructor(table: Table<BSChatFavorite>) {
    super(table);
  }

  /**
   * Find a favorite for a given chat, if one exists.
   */
  public async findByChat(chatId: string): Promise<BSChatFavorite | undefined> {
    return this.set.where("chatId").equals(chatId).first();
  }

  /**
   * Whether a chat is already favorited.
   */
  public async isChatFavorite(chatId: string): Promise<boolean> {
    return (await this.findByChat(chatId)) !== undefined;
  }

  /**
   * Create (or update the category of) a favorite for a chat.
   * - If the chat is not favorited yet, a new favorite is created.
   * - If it already is, only the category is updated (keeps the original date).
   */
  public async saveForChat(chatId: string, categoryId?: string): Promise<BSChatFavorite> {
    const existing = await this.findByChat(chatId);
    if (existing) {
      const updated: BSChatFavorite = { ...existing, categoryId };
      await this.set.put(updated);
      return updated;
    }
    const entity: BSChatFavorite = {
      id: uuidv7(),
      chatId,
      categoryId: categoryId || undefined,
      createdDate: new Date().toISOString(),
    };
    await this.set.add(entity);
    return entity;
  }

  /**
   * Remove a favorite for a chat, if present. Returns true when a row was
   * actually removed.
   */
  public async removeForChat(chatId: string): Promise<boolean> {
    const existing = await this.findByChat(chatId);
    if (!existing) return false;
    await this.set.delete(existing.id);
    return true;
  }
}
