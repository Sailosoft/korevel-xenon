// BSChatFavorite.Picker — Modal pickers for Chat Favorites.
//
// 1. BSChatFavoriteSavePicker — rendered inside a Bunny content-only dialog
//    from the Chat History "Favorite" row action. Lets the user assign the
//    chat to a category (or leave it undefined), create a brand-new category
//    inline, and then saves the favorite.
//
// 2. BSChatFavoriteFilterPicker — rendered from the Chat Favorites header
//    "Filter" action. Lets the user filter favorites by category
//    ("All", "Uncategorized", or a specific category).
//
// 3. BSChatFavoriteFilterButton — the dynamic header button that reflects the
//    currently active category filter label.

"use client";

import { Button } from "@heroui/react";
import { Filter, FolderPlus, Loader2, Plus, Star, Tag } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { bsDB } from "../../BSDatabase";
import type { BSChat } from "../chat/BSChat.Types";
import type { BSChatCategory } from "../chat-category/BSChatCategory.Types";
import {
  BSChatFavoriteFilterAll,
  BSChatFavoriteFilterNone,
  getBSChatFavoriteCategoryFilter,
  getBSChatFavoriteCategoryFilterLabel,
  setBSChatFavoriteCategoryFilter,
  type BSChatFavoriteCategoryFilter,
} from "./BSChatFavorite.Filter";

// ─── Shared pill style ─────────────────────────────────────────────────

const PILL_BASE =
  "px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 " +
  "border flex items-center gap-2 text-left";
const PILL_IDLE =
  "border-white/10 bg-white/5 text-gray-700 hover:border-red-200 hover:bg-red-50";
const PILL_ACTIVE =
  "border-red-200 bg-red-50 text-red-600 ring-1 ring-red-200";

// ─── Save picker (Chat History row action) ──────────────────────────────

export interface BSChatFavoriteSavePickerProps {
  /** The chat being added to favorites. */
  chat: BSChat;
  /** Close the wrapping dialog. */
  onClose: () => void;
}

export function BSChatFavoriteSavePicker({
  chat,
  onClose,
}: BSChatFavoriteSavePickerProps) {
  const [categories, setCategories] = useState<BSChatCategory[]>([]);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [existing, setExisting] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reloadCategories = useCallback(async () => {
    const cats = await bsDB.chatCategoriesRepo.listAll();
    setCategories(cats);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [cats, fav] = await Promise.all([
        bsDB.chatCategoriesRepo.listAll(),
        bsDB.chatFavoritesRepo.findByChat(chat.id),
      ]);
      if (!alive) return;
      setCategories(cats);
      setExisting(fav !== undefined);
      setCategoryId(fav?.categoryId);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [chat.id]);

  const handleAddCategory = useCallback(async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    setError(null);
    try {
      const created = await bsDB.chatCategoriesRepo.createCategory({ name });
      await reloadCategories();
      setCategoryId(created.id);
      setNewCategoryName("");
    } catch {
      setError("Could not create the category. Please try again.");
    }
  }, [newCategoryName, reloadCategories]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await bsDB.chatFavoritesRepo.saveForChat(chat.id, categoryId);
      setSaved(true);
    } catch {
      setError("Could not save the favorite. Please try again.");
      setSaving(false);
    }
  }, [chat.id, categoryId]);

  const newCategoryTrimmed = newCategoryName.trim();

  return (
    <div className="space-y-4">
      {/* Chat summary */}
      <div className="flex items-start gap-2.5 rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5">
        <Star className="w-4 h-4 mt-0.5 text-red-400 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">
            {chat.title}
          </p>
          <p className="text-xs text-gray-500">
            {new Date(chat.createdDate).toLocaleString()}
          </p>
        </div>
      </div>

      {error && (
        <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {saved ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
          <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
            <Star className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-gray-800">
            Added to favorites
          </p>
          <p className="text-xs text-gray-500">
            {categoryId
              ? "This chat was saved with its category."
              : "This chat was saved without a category."}
          </p>
        </div>
      ) : (
        <>
          {existing && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              This chat is already a favorite — saving will update its
              category.
            </p>
          )}

          {/* Category selection */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Choose a category (optional)
            </p>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading
                categories…
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`${PILL_BASE} ${categoryId === undefined ? PILL_ACTIVE : PILL_IDLE}`}
                  onClick={() => setCategoryId(undefined)}
                >
                  <Tag className="w-3.5 h-3.5" /> No category
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`${PILL_BASE} ${categoryId === cat.id ? PILL_ACTIVE : PILL_IDLE}`}
                    onClick={() => setCategoryId(cat.id)}
                  >
                    <Tag className="w-3.5 h-3.5" /> {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Inline category creation */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              New category
            </p>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <FolderPlus className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleAddCategory();
                  }}
                  placeholder="e.g. Work, Research, Personal"
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                isDisabled={!newCategoryTrimmed}
                onPress={() => void handleAddCategory()}
                className="shrink-0"
              >
                <Plus className="w-4 h-4" /> Add
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
        {saved ? (
          <Button type="button" variant="primary" onPress={onClose}>
            Done
          </Button>
        ) : (
          <>
            <Button type="button" variant="secondary" onPress={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              isDisabled={saving}
              onPress={() => void handleSave()}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {existing ? "Update Favorite" : "Save to Favorites"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Filter picker (Chat Favorites header action) ───────────────────────

export interface BSChatFavoriteFilterPickerProps {
  /** Close the wrapping dialog. */
  onClose: () => void;
}

export function BSChatFavoriteFilterPicker({
  onClose,
}: BSChatFavoriteFilterPickerProps) {
  const [categories, setCategories] = useState<BSChatCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const active = getBSChatFavoriteCategoryFilter();

  useEffect(() => {
    let alive = true;
    (async () => {
      const cats = await bsDB.chatCategoriesRepo.listAll();
      if (!alive) return;
      setCategories(cats);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const apply = useCallback(
    (filter: BSChatFavoriteCategoryFilter) => {
      setBSChatFavoriteCategoryFilter(filter);
      onClose();
    },
    [onClose],
  );

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        Filter favorites by category
      </p>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading categories…
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className={`${PILL_BASE} ${active === BSChatFavoriteFilterAll ? PILL_ACTIVE : PILL_IDLE}`}
            onClick={() => apply(BSChatFavoriteFilterAll)}
          >
            <Tag className="w-3.5 h-3.5" /> All categories
          </button>
          <button
            type="button"
            className={`${PILL_BASE} ${active === BSChatFavoriteFilterNone ? PILL_ACTIVE : PILL_IDLE}`}
            onClick={() => apply(BSChatFavoriteFilterNone)}
          >
            <Tag className="w-3.5 h-3.5" /> Uncategorized
          </button>
          {categories.length === 0 && !loading ? (
            <p className="text-xs text-gray-400 px-1">
              No categories yet — create one in{" "}
              <span className="font-medium text-gray-500">
                Chat Categories
              </span>
              .
            </p>
          ) : (
            categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`${PILL_BASE} ${active === cat.id ? PILL_ACTIVE : PILL_IDLE}`}
                onClick={() => apply(cat.id)}
              >
                <Tag className="w-3.5 h-3.5" /> {cat.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Dynamic header filter button ───────────────────────────────────────

export function BSChatFavoriteFilterButton({
  onOpen,
}: {
  /** Opens the filter picker dialog. */
  onOpen: () => void;
}) {
  const active = getBSChatFavoriteCategoryFilter();
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>(
    {},
  );

  // Re-resolve the active filter's category name whenever the filter changes.
  useEffect(() => {
    let alive = true;
    bsDB.chatCategoriesRepo.listAll().then((cats) => {
      if (!alive) return;
      setCategoryNames(
        Object.fromEntries(cats.map((cat) => [cat.id, cat.name])),
      );
    });
    return () => {
      alive = false;
    };
  }, [active]);

  const label = getBSChatFavoriteCategoryFilterLabel(categoryNames);

  return (
    <Button type="button" variant="secondary" onPress={onOpen}>
      <Filter className="w-4 h-4" />
      <span className="hidden sm:inline ml-1">Filter: {label}</span>
      <span className="sm:hidden ml-1">Filter</span>
    </Button>
  );
}
