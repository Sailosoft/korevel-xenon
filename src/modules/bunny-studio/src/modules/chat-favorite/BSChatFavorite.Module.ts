// BSChatFavorite.Module — BunnyFeature module for Chat Favorites.
//
// Lists saved chats (feature: Chat Favorites). Each favorite optionally
// belongs to a ChatCategory (`categoryId`). The header "Filter" action opens a
// picker that filters the list by category via the module-level filter store
// (see BSChatFavorite.Filter.ts).

import { createElement } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { BunnyFeature } from "@/src/modules/bunny/src/feature/BunnyFeature";
import type { BunnySelectOption } from "@/src/modules/bunny/src/form/BunnyForm.Interface";
import type { AdminPanelQueryOptions } from "@/src/modules/admin-panel/features/query/admin-panel-query.interface";
import { bsDB } from "../../BSDatabase";
import type { BSChatFavorite } from "./BSChatFavorite.Types";
import {
  applyBSChatFavoriteCategoryFilter,
} from "./BSChatFavorite.Filter";
import {
  BSChatFavoriteFilterButton,
  BSChatFavoriteFilterPicker,
} from "./BSChatFavorite.Picker";

/** Async chat options for the favorite form's "Chat" select. */
async function toChatSelectOptions(): Promise<BunnySelectOption[]> {
  const res = await bsDB.chatsRepo.query.getAll({
    page: 0,
    pageSize: 0,
  });
  return res.data
    .sort((a, b) => b.createdDate.localeCompare(a.createdDate))
    .map((chat) => ({ label: chat.title, value: chat.id }));
}

export const bsChatFavoriteModule = BunnyFeature.create<
  BSChatFavorite,
  BSChatFavorite
>("Chat Favorite", "id", (feature) => {
  feature.setModuleUrl("/modules/bunny-studio/chat-favorites*");
  feature.useDefault();

  feature.configureTable((table) => {
    table.addColumns([
      {
        field: "chatId",
        header: "Chat",
        sortable: true,
        isRowHeader: true,
        mapping: {
          getRecords: async () =>
            (
              await bsDB.chatsRepo.query.getAll({ page: 0, pageSize: 0 })
            ).data as unknown as Record<string, unknown>[],
          key: "id",
          label: "title",
          fallback: "—",
        },
      },
      {
        field: "categoryId",
        header: "Category",
        sortable: true,
        mapping: {
          getRecords: async () =>
            (
              await bsDB.chatCategoriesRepo.query.getAll({
                page: 0,
                pageSize: 0,
              })
            ).data as unknown as Record<string, unknown>[],
          key: "id",
          label: "name",
          fallback: "Uncategorized",
        },
      },
      {
        field: "createdDate",
        header: "Favorited",
        sortable: true,
        render: (row) => new Date(row.createdDate).toLocaleString(),
      },
    ]);
  });

  feature.configureForm((form) => {
    form.setOnSuccess({ mode: "closeOnly" });
    form.addFields([
      {
        name: "chatId",
        label: "Chat",
        placeholder: "Select a chat",
        type: "select",
        required: true,
        options: () => toChatSelectOptions(),
      },
      {
        name: "categoryId",
        label: "Category",
        placeholder: "Select a category (optional)",
        type: "select",
        required: false,
        options: () => bsDB.chatCategoriesRepo.toOptionsWithNone(),
      },
    ]);
    form.setGridCols(1);
  });

  feature.configureHeader((header) => {
    // Custom "Filter by category" button (dynamic label via render).
    header.addAction({
      id: "filter-category",
      label: "Filter",
      variant: "secondary",
      displayMode: "always",
      render: (context) =>
        createElement(BSChatFavoriteFilterButton, {
          onOpen: () => {
            context?.adminPanel.dialog.openDialog({
              actionId: "filter-chat-favorites",
              title: "Filter by Category",
              contentOnly: true,
              size: "sm",
              hideFooter: true,
              children: createElement(BSChatFavoriteFilterPicker, {
                // Applying a filter writes to the store, closes the dialog,
                // then refreshes the table so the new filter takes effect.
                onClose: () => {
                  context?.adminPanel.dialog.closeDialog();
                  void context?.adminPanel.table.fetchData();
                },
              }),
              onConfirm: async () => ({ success: true }),
            });
          },
        }),
    });
  });

  feature.configureRow((row) => {
    // Chat favorites are managed here — hide the generic edit/view defaults.
    row.hide(["view", "edit", "delete"]);
    row.addAction({
      id: "open-chat",
      label: "Open",
      icon: createElement(ExternalLink, { className: "w-4 h-4" }),
      variant: "primary",
      onClick: (favorite, context) => {
        context.router.push(`/modules/bunny-studio/chat/${favorite.chatId}`);
      },
    });
    row.addAction({
      id: "remove-favorite",
      label: "Remove",
      icon: createElement(Trash2, { className: "w-4 h-4" }),
      variant: "danger-soft",
      onClick: (favorite, context) => {
        context.adminPanel.del.openDeleteConfirm(favorite.id);
      },
    });
  });

  // Read-mostly data layer: apply the active category filter + latest first.
  const baseQuery = bsDB.chatFavoritesRepo.dataLayer.query;
  feature.useDataLayer({
    query: {
      ...baseQuery,
      getAll: async (
        options: AdminPanelQueryOptions,
        overrideOptions?: AdminPanelQueryOptions,
      ) => {
        const res = await baseQuery.getAll(options, overrideOptions);
        const filtered = applyBSChatFavoriteCategoryFilter(res.data);
        return {
          ...res,
          data: [...filtered].sort((a, b) =>
            b.createdDate.localeCompare(a.createdDate),
          ),
          total: filtered.length,
        };
      },
    },
    // Normalize the optional category select (value "" → undefined) so
    // favorites created through the form are correctly uncategorized.
    mutation: {
      ...bsDB.chatFavoritesRepo.dataLayer.mutation,
      create: async (data) => {
        const normalized: BSChatFavorite = {
          ...data,
          categoryId: data.categoryId || undefined,
        };
        return bsDB.chatFavoritesRepo.dataLayer.mutation.create(normalized);
      },
      update: async (id, data) => {
        const normalized: BSChatFavorite = {
          ...data,
          categoryId: data.categoryId || undefined,
        };
        return bsDB.chatFavoritesRepo.dataLayer.mutation.update(
          id,
          normalized,
        );
      },
    },
  });
});
