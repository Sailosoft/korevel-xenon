// BSChatCategory.Module — BunnyFeature module for Chat Favorites Categories.
//
// Categories organize saved chat favorites (feature: Chat Favorites). They are
// created here and referenced by BSChatFavorite.categoryId.

import { BunnyFeature } from "@/src/modules/bunny/src/feature/BunnyFeature";
import { bsDB } from "../../BSDatabase";
import type { BSChatCategory } from "./BSChatCategory.Types";

export const bsChatCategoryModule = BunnyFeature.create<
  BSChatCategory,
  BSChatCategory
>("Chat Category", "id", (feature) => {
  feature.setModuleUrl("/modules/bunny-studio/chat-categories*");
  feature.useDefault();

  feature.configureTable((table) => {
    table.addColumns([
      {
        field: "name",
        header: "Name",
        sortable: true,
        isRowHeader: true,
      },
      {
        field: "description",
        header: "Description",
        sortable: false,
        render: (row) => row.description || "—",
      },
      {
        field: "createdDate",
        header: "Created",
        sortable: true,
        render: (row) => new Date(row.createdDate).toLocaleDateString(),
      },
    ]);
  });

  feature.configureForm((form) => {
    form.setOnSuccess({ mode: "closeOnly" });
    form.addFields([
      {
        name: "name",
        label: "Name",
        placeholder: "e.g. Work, Research, Personal",
        type: "text",
        required: true,
      },
      {
        name: "description",
        label: "Description",
        placeholder: "Optional description for this category",
        type: "textarea",
        rows: 3,
      },
    ]);
    form.setGridCols(1);
  });

  feature.useDataLayer(bsDB.chatCategoriesRepo.dataLayer);
});
