// BSChatHistory.FavoriteFilter — modal picker + dynamic header button for the
// Chat History "Favorite" filter (feature: Chat History favorite filter).
//
// 1. BSChatHistoryFavoriteFilterPicker — rendered inside a Bunny content-only
//    dialog from the Chat History header "Filter" action. Lets the user filter
//    the chat list by favorite status ("All chats" or "Favorites only").
//
// 2. BSChatHistoryFavoriteFilterButton — the dynamic header button that
//    reflects the currently active favorite filter label.

"use client";

import { Button } from "@heroui/react";
import { Filter, Star } from "lucide-react";
import React, { useCallback } from "react";
import {
  BSChatHistoryFavoriteFilterAll,
  BSChatHistoryFavoriteFilterFavorites,
  getBSChatHistoryFavoriteFilter,
  getBSChatHistoryFavoriteFilterLabel,
  setBSChatHistoryFavoriteFilter,
  type BSChatHistoryFavoriteFilter,
} from "./BSChatHistory.Filter";

// ─── Shared pill style ─────────────────────────────────────────────────

const PILL_BASE =
  "px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 " +
  "border flex items-center gap-2 text-left";
const PILL_IDLE =
  "border-white/10 bg-white/5 text-gray-700 hover:border-red-200 hover:bg-red-50";
const PILL_ACTIVE =
  "border-red-200 bg-red-50 text-red-600 ring-1 ring-red-200";

// ─── Filter picker (Chat History header action) ────────────────────────

export interface BSChatHistoryFavoriteFilterPickerProps {
  /** Close the wrapping dialog. */
  onClose: () => void;
}

export function BSChatHistoryFavoriteFilterPicker({
  onClose,
}: BSChatHistoryFavoriteFilterPickerProps) {
  const active = getBSChatHistoryFavoriteFilter();

  const apply = useCallback(
    (filter: BSChatHistoryFavoriteFilter) => {
      setBSChatHistoryFavoriteFilter(filter);
      onClose();
    },
    [onClose],
  );

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        Filter chats by favorite
      </p>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          className={`${PILL_BASE} ${
            active === BSChatHistoryFavoriteFilterAll
              ? PILL_ACTIVE
              : PILL_IDLE
          }`}
          onClick={() => apply(BSChatHistoryFavoriteFilterAll)}
        >
          <Star className="w-3.5 h-3.5" /> All chats
        </button>
        <button
          type="button"
          className={`${PILL_BASE} ${
            active === BSChatHistoryFavoriteFilterFavorites
              ? PILL_ACTIVE
              : PILL_IDLE
          }`}
          onClick={() => apply(BSChatHistoryFavoriteFilterFavorites)}
        >
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />{" "}
          Favorites only
        </button>
      </div>
    </div>
  );
}

// ─── Dynamic header filter button ──────────────────────────────────────

export function BSChatHistoryFavoriteFilterButton({
  onOpen,
}: {
  /** Opens the filter picker dialog. */
  onOpen: () => void;
}) {
  const label = getBSChatHistoryFavoriteFilterLabel();

  return (
    <Button type="button" variant="secondary" onPress={onOpen}>
      <Filter className="w-4 h-4" />
      <span className="hidden sm:inline ml-1">Filter: {label}</span>
      <span className="sm:hidden ml-1">Filter</span>
    </Button>
  );
}
