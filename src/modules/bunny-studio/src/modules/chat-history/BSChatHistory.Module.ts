// BSChatHistory.Module — BunnyFeature module for Chat History.
//
// Displays all chats (latest first) using the Bunny module framework. A custom
// row action routes to the chat detail page via the BunnyFeature Row Action
// Router (feature: ChatHistory).

import { createElement } from "react";
import { ExternalLink } from "lucide-react";
import { BunnyFeature } from "@/src/modules/bunny/src/feature/BunnyFeature";
import type { AdminPanelQueryOptions } from "@/src/modules/admin-panel/features/query/admin-panel-query.interface";
import { bsDB } from "../../BSDatabase";
import type { BSChat } from "../chat/BSChat.Types";

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
      // Hide the default "edit" row action — chat history is read-mostly.
      row.hide(["edit"]);
      row.addAction({
        id: "open-chat",
        label: "Open",
        icon: createElement(ExternalLink, { className: "w-4 h-4" }),
        variant: "primary",
        onClick: (chat, context) => {
          context.router.push(`/modules/bunny-studio/chat/${chat.id}`);
        },
      });
    });

    feature.configureHeader((header) => {
      header.hide(["create"]);
    })

    // Read-mostly data layer, sorted latest first.
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
          return {
            ...res,
            data: [...res.data].sort((a, b) =>
              b.createdDate.localeCompare(a.createdDate),
            ),
          };
        },
      },
      mutation: bsDB.chatsRepo.dataLayer.mutation,
    });
  },
);
