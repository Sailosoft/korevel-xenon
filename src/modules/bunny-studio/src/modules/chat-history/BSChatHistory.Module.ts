// BSChatHistory.Module — BunnyFeature module for Chat History.
//
// Displays all chats (latest first) using the Bunny module framework. A custom
// row action routes to the chat detail page via the BunnyFeature Row Action
// Router (feature: ChatHistory).

import { createElement } from "react";
import { ExternalLink, Star, Trash2 } from "lucide-react";
import { BunnyFeature } from "@/src/modules/bunny/src/feature/BunnyFeature";
import type { AdminPanelQueryOptions } from "@/src/modules/admin-panel/features/query/admin-panel-query.interface";
import { bsDB } from "../../BSDatabase";
import type { BSChat } from "../chat/BSChat.Types";
import { BSChatFavoriteSavePicker } from "../chat-favorite/BSChatFavorite.Picker";
import { BSChatHistoryFavoriteNotice } from "./BSChatHistory.FavoriteNotice";
import { applyBSChatHistoryFavoriteFilter } from "./BSChatHistory.Filter";
import {
  BSChatHistoryFavoriteFilterButton,
  BSChatHistoryFavoriteFilterPicker,
} from "./BSChatHistory.FavoriteFilter";

export const bsChatHistoryModule = BunnyFeature.create<BSChat, BSChat>(
  "Chat History",
  "id",
  (feature) => {
    feature.setModuleUrl("/modules/bunny-studio/history*");

    // Enable the framework's default row actions (view/delete) only — chat
    // history is read-mostly, so header defaults are intentionally not enabled.
    // feature.useDefaultRowActions();
    feature.useDefault();

    feature.configureTable((table) => {
      table.addColumns([
        {
          field: "isFavorite",
          header: "Favorite",
          width: 90,
          render: (row) =>
            row.isFavorite
              ? createElement(Star, {
                  className: "w-4 h-4 text-amber-400",
                  fill: "currentColor",
                })
              : createElement("span", { className: "text-gray-300" }, "—"),
        },
        {
          field: "title",
          header: "Title",
          sortable: true,
          isRowHeader: true,
        },
        {
          field: "createdDate",
          header: "Created",
          sortable: true,
          render: (row) =>
            createElement(
              "span",
              { className: "text-gray-500" },
              new Date(row.createdDate).toLocaleString(),
            ),
        },
        {
          field: "provider",
          header: "Provider",
          sortable: true,
          render: (row) => row.provider || "—",
        },
        {
          field: "model",
          header: "Model",
          sortable: true,
          render: (row) => row.model || "—",
        },
      ]);
    });

    // Route to open a previous chat (BunnyFeature Row Action Router).
    feature.configureRow((row) => {
      // Hide the default "edit" and "delete" row actions — chat history is
      // read-mostly, and delete is replaced below with a favorite-guarded one.
      row.hide(["edit", "delete"]);

      // Guarded delete — chats saved in Favorites are protected (skipped) from
      // deletion in Chat History (feature: Chat Favorites).
      row.addAction({
        id: "delete",
        label: "Delete",
        icon: createElement(Trash2, { className: "w-4 h-4" }),
        variant: "danger-soft",
        onClick: async (chat, context) => {
          if (await bsDB.chatFavoritesRepo.isChatFavorite(chat.id)) {
            context.adminPanel.dialog.openDialog({
              actionId: "delete-chat-favorite-blocked",
              title: "Delete blocked",
              contentOnly: true,
              size: "sm",
              hideFooter: true,
              children: createElement(BSChatHistoryFavoriteNotice, {
                chat,
                onClose: () => context.adminPanel.dialog.closeDialog(),
                onRemove: () => {
                  context.adminPanel.dialog.closeDialog();
                  // Refresh so the favorite marker updates after unfavoriting.
                  void context.adminPanel.table.fetchData();
                },
              }),
              onConfirm: async () => ({ success: true }),
            });
            return;
          }
          context.adminPanel.del.openDeleteConfirm(chat.id);
        },
      });

      row.addAction({
        id: "open-chat",
        label: "Open",
        icon: createElement(ExternalLink, { className: "w-4 h-4" }),
        variant: "primary",
        onClick: (chat, context) => {
          context.router.push(`/modules/bunny-studio/chat/${chat.id}`);
        },
      });
      // Save the chat as a favorite — opens a modal to pick a category
      // (or leave it undefined) before saving (feature: Chat Favorites).
      row.addAction({
        id: "favorite",
        label: "Favorite",
        icon: createElement(Star, { className: "w-4 h-4" }),
        variant: "secondary",
        onClick: (chat, context) => {
          context.adminPanel.dialog.openDialog({
            actionId: "save-chat-favorite",
            title: "Save to Favorites",
            contentOnly: true,
            size: "sm",
            hideFooter: true,
            children: createElement(BSChatFavoriteSavePicker, {
              chat,
              onClose: () => {
                context.adminPanel.dialog.closeDialog();
                // Refresh so the favorite marker reflects the new state.
                void context.adminPanel.table.fetchData();
              },
            }),
            onConfirm: async () => ({ success: true }),
          });
        },
      });
    });

    feature.configureHeader((header) => {
      header.hide(["create"]);
      // Filter the chat list by favorite status (feature: Chat History favorite
      // filter). The dynamic button opens a picker that writes to the
      // module-level filter store, then refreshes the table so the new filter
      // takes effect.
      header.addAction({
        id: "filter-favorite",
        label: "Filter",
        variant: "secondary",
        displayMode: "always",
        render: (context) =>
          createElement(BSChatHistoryFavoriteFilterButton, {
            onOpen: () => {
              context?.adminPanel.dialog.openDialog({
                actionId: "filter-chat-history-favorites",
                title: "Filter by Favorite",
                contentOnly: true,
                size: "sm",
                hideFooter: true,
                children: createElement(BSChatHistoryFavoriteFilterPicker, {
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
    })

    // Read-mostly data layer, sorted latest first. Rows are annotated with the
    // transient `isFavorite` flag so the table can render the favorite marker.
    feature.useDataLayer({
      query: {
        ...bsDB.chatsRepo.dataLayer.query,
        getAll: async (
          options: AdminPanelQueryOptions,
          overrideOptions?: AdminPanelQueryOptions,
        ) => {
          const res = await bsDB.chatsRepo.dataLayer.query.getAll(
            options,
            overrideOptions,
          );
          const favorites = await bsDB.chatFavoritesRepo.query.getAll({
            page: 0,
            pageSize: 0,
          });
          const favoriteChatIds = new Set(
            favorites.data.map((favorite) => favorite.chatId),
          );
          const rows = res.data
            .map((chat) => ({
              ...chat,
              isFavorite: favoriteChatIds.has(chat.id),
            }))
            .sort((a, b) => b.createdDate.localeCompare(a.createdDate));
          // Apply the active favorite filter (all / favorites only).
          const filtered = applyBSChatHistoryFavoriteFilter(rows);
          return {
            ...res,
            data: filtered,
            total: filtered.length,
          };
        },
      },
      mutation: {
        ...bsDB.chatsRepo.dataLayer.mutation,
        // Safety net: block deletion of favorited chats at the data layer too.
        // Covers the header batch delete and any other delete path.
        delete: async (id) => {
          if (await bsDB.chatFavoritesRepo.isChatFavorite(String(id))) {
            return {
              status: "error",
              error: new Error("Chat is a favorite"),
              message:
                "This chat is saved to Favorites and cannot be deleted from Chat History.",
            };
          }
          return bsDB.chatsRepo.dataLayer.mutation.delete(id);
        },
      },
    });
  },
);
