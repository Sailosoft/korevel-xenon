// BSChatCategory.Types — Types for Bunny AI Studio Chat Favorites Categories
//
// A category groups saved chat favorites (feature: Chat Favorites). A favorite
// may be uncategorized — `categoryId` is undefined on BSChatFavorite.

export interface BSChatCategory {
  /** uuidv7 primary key */
  id: string;
  /** display name */
  name: string;
  /** optional description */
  description?: string;
  /** ISO datetime string */
  createdDate: string;
}

/** Form shape used when creating/editing a chat category */
export type BSChatCategoryForm = Omit<BSChatCategory, "id" | "createdDate">;
