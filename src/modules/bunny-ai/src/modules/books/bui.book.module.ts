import {
  AdminPanelQueryOptions,
  GetAllResponse,
} from "@/src/modules/admin-panel/features/query/admin-panel-query.interface";
import { AdminPanelId } from "@/src/modules/admin-panel/features/id/admin-panel-id.interface";
import {
  AdminPanelResult,
  adminPanelResultSuccess,
} from "@/src/modules/admin-panel/shared/admin-panel-result";
import { BunnyConfig } from "@/src/modules/bunny/src/Bunny.Interface";
import { BUIBookChapterEntity, BUIBookEntity } from "./bui.book.entity";
import { buiDatabase } from "../../database/bui.database";
import { adminPanelQueryResponseAll } from "../../../../admin-panel/features/query/admin-panel-query.util";

export const buiBookModule: BunnyConfig<BUIBookEntity, BUIBookChapterEntity> = {
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
    getAll: async function (
      _options: AdminPanelQueryOptions,
      _overrideOptions?: AdminPanelQueryOptions,
    ): Promise<GetAllResponse<BUIBookEntity>> {
      return adminPanelQueryResponseAll({
        data: await buiDatabase.books.toArray(),
      });
    },
    getOne: async function (
      id: string | number,
    ): Promise<BUIBookEntity | undefined> {
      return await buiDatabase.books.get(Number(id));
    },
  },
  mutation: {
    create: async function (
      data: BUIBookEntity,
    ): Promise<AdminPanelResult<BUIBookEntity, unknown>> {
      const id = await buiDatabase.books.add(data);

      return adminPanelResultSuccess<BUIBookEntity>(
        (await buiDatabase.books.get(id)) as BUIBookEntity,
      );
    },
    update: async function (
      id: AdminPanelId,
      data: BUIBookEntity,
    ): Promise<AdminPanelResult<BUIBookEntity, unknown> | undefined> {
      if (typeof id !== "number") {
        throw new Error("Invalid ID type. Expected a number.");
      }

      await buiDatabase.books.update(id, data);

      return adminPanelResultSuccess<BUIBookEntity>(
        (await buiDatabase.books.get(id)) as BUIBookEntity,
      );
    },
    delete: async function (
      iid: AdminPanelId,
    ): Promise<AdminPanelResult<BUIBookEntity, unknown> | undefined> {
      const id = Number(iid);
      await buiDatabase.books.delete(id);

      return adminPanelResultSuccess<BUIBookEntity>(
        (await buiDatabase.books.get(id)) as BUIBookEntity,
      );
    },
  },
};
