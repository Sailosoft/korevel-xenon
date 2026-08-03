// BSChat.Repository — Repository for Bunny AI Studio Chat & Conversation
//
// Provides chat-specific query helpers on top of PhazeRepository.

import { Table } from "dexie";
import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import { v7 as uuidv7 } from "uuid";
import type { BSChat, BSConversation } from "./BSChat.Types";

export class BSChatRepository extends PhazeRepository<BSChat> {
  constructor(table: Table<BSChat>) {
    super(table);
  }

  /**
   * Create a new chat with a datetime-based title (used for initial add).
   */
  public async createChat(overrides: Partial<BSChat> = {}): Promise<BSChat> {
    const now = new Date();
    const title = overrides.title ?? this.formatDateTitle(now);
    const chat: BSChat = {
      id: overrides.id ?? uuidv7(),
      title,
      createdDate: now.toISOString(),
      ...overrides,
    };
    await this.set.add(chat);
    return chat;
  }

  /**
   * Default title format for a brand-new chat: e.g. "New Chat — Aug 2, 2026, 11:18 PM"
   */
  private formatDateTitle(date: Date): string {
    return `New Chat — ${date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }
}

/** Static helpers for conversations */
export class BSConversationHelper {
  /**
   * Fetch all conversations for a chat, ordered oldest → newest.
   */
  public static async listForChat(
    table: Table<BSConversation>,
    chatId: string,
  ): Promise<BSConversation[]> {
    const items = await table.where("chatId").equals(chatId).toArray();
    return items.sort((a, b) =>
      (a.createdDate ?? "").localeCompare(b.createdDate ?? ""),
    );
  }
}
