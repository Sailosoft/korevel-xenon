// BSChatFavorite.Filter — module-level category filter state for Chat Favorites
//
// The Bunny feature config is deep-frozen, so the active category filter is
// stored here (module scope) and read by the Chat Favorite data layer's
// `getAll` override. The header "Filter" picker writes to this store, then the
// table is refreshed via `adminPanel.table.fetchData()`.

export type BSChatFavoriteCategoryFilter =
  | "all" // every favorite, regardless of category
  | "none" // only uncategorized favorites (categoryId === undefined)
  | string; // a specific category id

export const BSChatFavoriteFilterAll = "all" as const;
export const BSChatFavoriteFilterNone = "none" as const;

let activeFilter: BSChatFavoriteCategoryFilter = BSChatFavoriteFilterAll;

/** Current active category filter. */
export function getBSChatFavoriteCategoryFilter(): BSChatFavoriteCategoryFilter {
  return activeFilter;
}

/** Set the active category filter. */
export function setBSChatFavoriteCategoryFilter(
  filter: BSChatFavoriteCategoryFilter,
): void {
  activeFilter = filter;
}

/** Reset the filter back to "all". */
export function resetBSChatFavoriteCategoryFilter(): void {
  activeFilter = BSChatFavoriteFilterAll;
}

/**
 * Apply the active filter to a list of favorites.
 * - `"all"` → unchanged
 * - `"none"` → keep favorites without a category
 * - `categoryId` → keep favorites in that category
 */
export function applyBSChatFavoriteCategoryFilter<T extends { categoryId?: string }>(
  items: T[],
): T[] {
  if (activeFilter === BSChatFavoriteFilterAll) return items;
  if (activeFilter === BSChatFavoriteFilterNone) {
    return items.filter((item) => !item.categoryId);
  }
  return items.filter((item) => item.categoryId === activeFilter);
}

/** Human-readable label for the active filter (used in the header button). */
export function getBSChatFavoriteCategoryFilterLabel(
  categoryNameById: Record<string, string>,
): string {
  if (activeFilter === BSChatFavoriteFilterAll) return "All categories";
  if (activeFilter === BSChatFavoriteFilterNone) return "Uncategorized";
  return categoryNameById[activeFilter] ?? "Unknown category";
}
