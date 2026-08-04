// BSChatHistory.Filter — module-level favorite filter state for Chat History.
//
// The Bunny feature config is deep-frozen, so the active "favorite" filter is
// stored here (module scope) and read by the Chat History data layer's `getAll`
// override. The header "Filter" picker writes to this store, then the table is
// refreshed via `adminPanel.table.fetchData()`.

export type BSChatHistoryFavoriteFilter = "all" | "favorites";

export const BSChatHistoryFavoriteFilterAll = "all" as const;
export const BSChatHistoryFavoriteFilterFavorites = "favorites" as const;

let activeFilter: BSChatHistoryFavoriteFilter = BSChatHistoryFavoriteFilterAll;

/** Current active favorite filter. */
export function getBSChatHistoryFavoriteFilter(): BSChatHistoryFavoriteFilter {
  return activeFilter;
}

/** Set the active favorite filter. */
export function setBSChatHistoryFavoriteFilter(
  filter: BSChatHistoryFavoriteFilter,
): void {
  activeFilter = filter;
}

/** Reset the filter back to "all". */
export function resetBSChatHistoryFavoriteFilter(): void {
  activeFilter = BSChatHistoryFavoriteFilterAll;
}

/**
 * Apply the active filter to a list of chats.
 * - `"all"` → unchanged
 * - `"favorites"` → keep only chats whose transient `isFavorite` flag is set
 */
export function applyBSChatHistoryFavoriteFilter<
  T extends { isFavorite?: boolean },
>(items: T[]): T[] {
  if (activeFilter === BSChatHistoryFavoriteFilterAll) return items;
  return items.filter((item) => item.isFavorite);
}

/** Human-readable label for the active filter (used in the header button). */
export function getBSChatHistoryFavoriteFilterLabel(): string {
  return activeFilter === BSChatHistoryFavoriteFilterAll
    ? "All chats"
    : "Favorites only";
}
