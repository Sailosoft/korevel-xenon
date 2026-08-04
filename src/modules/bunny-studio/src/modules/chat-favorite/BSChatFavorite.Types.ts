// BSChatFavorite.Types — Types for Bunny AI Studio Chat Favorites
//
// A saved chat favorite references a chat and an optional category
// (feature: Chat Favorites). When `categoryId` is undefined the favorite is
// uncategorized.

export interface BSChatFavorite {
  /** uuidv7 primary key */
  id: string;
  /** owning chat id (FK → chats.id) */
  chatId: string;
  /** optional category id (FK → chatCategories.id); undefined = uncategorized */
  categoryId?: string;
  /** ISO datetime string */
  createdDate: string;
}

/** Form shape used when creating/editing a chat favorite */
export type BSChatFavoriteForm = Omit<BSChatFavorite, "id" | "createdDate">;
