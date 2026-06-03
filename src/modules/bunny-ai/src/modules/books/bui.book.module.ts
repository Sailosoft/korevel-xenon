import { BunnyConfig } from "@/src/modules/bunny/src/Bunny.Interface";
import { BUIBookEntity } from "./bui.book.entity";

import { BUIBookRepository } from "./bui.book.repository";

const repository = new BUIBookRepository();

export const buiBookModule: BunnyConfig<BUIBookEntity, BUIBookEntity> = {
  title: "Book",
  titlePlural: "Books",
  rowKey: "id",
  columns: [
    {
      field: "id",
      header: "Id",
      sortable: true,
      isRowHeader: true,
    },
    {
      field: "title",
      header: "Title",
      sortable: true,
    },
    {
      field: "description",
      header: "Description",
    },
  ],
  formConfig: {
    fields: [
      {
        name: "title",
        label: "Title",
        type: "text",
        rules: [
          {
            rule: "required",
            message: "Title is required",
          },
        ],
      },
      {
        name: "description",
        label: "Description",
        type: "editor",
        rules: [
          {
            rule: "required",
            message: "Description is required",
          },
        ],
      },
    ],
  },
  defaultHeaderActions: true,
  headerActions: [],
  defaultRowActions: true,
  modalHeaderActions: [],
  query: {
    getAll: repository.panelGetAll,
    getOne: repository.panelGetOne,
  },
  mutation: {
    create: repository.panelCreate,
    update: repository.panelUpdate,
    delete: repository.panelDelete,
  },
};
