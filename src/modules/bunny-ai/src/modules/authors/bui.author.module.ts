import { BunnyConfig } from "@/src/modules/bunny/src/Bunny.Interface";
import { BUIAuthor } from "./bui.author.entity";
import {
  AdminPanelQueryOptions,
  GetAllResponse,
} from "@/src/modules/admin-panel/features/query/admin-panel-query.interface";
import { AdminPanelId } from "@/src/modules/admin-panel/features/id/admin-panel-id.interface";
import {
  AdminPanelResult,
  adminPanelResultSuccess,
} from "@/src/modules/admin-panel/shared/admin-panel-result";
import { buiDatabase } from "../../database/bui.database";
import { adminPanelQueryResponseAll } from "../../../../admin-panel/features/query/admin-panel-query.util";
import React from "react";
import { CircleFadingArrowUp } from "lucide-react";
import buiAuthorServerEnhance from "./bui.author.server.enhance";

export const buiAuthorModule: BunnyConfig<BUIAuthor, BUIAuthor> = {
  title: "Author",
  titlePlural: "Authors",
  rowKey: "id",
  columns: [
    {
      field: "id",
      header: "Id",
      sortable: true,
      isRowHeader: true,
    },
    {
      field: "name",
      header: "Name",
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
        name: "name",
        label: "Name",
        type: "text",
        rules: [
          {
            rule: "required",
            message: "Name is required",
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
  headerActions: [
    // {
    //   id: 'enhanced',
    //   label: 'Enhanced',
    //   icon: React.createElement(CircleFadingArrowUp),
    //   onClick: (kernel) => {
    //     console.log(kernel?.panel.table.selection);
    //   }
    // }
  ],
  defaultRowActions: true,
  modalHeaderActions: [
    {
      id: "enhanced",
      label: "Enhanced",
      icon: React.createElement(CircleFadingArrowUp),
      variant: "default",
      hide: ["create"],
      onClick: async (context) => {
        const { adminPanel } = context!;
        const result = await buiAuthorServerEnhance();
        console.log(result);

        adminPanel.form.setFormData({
          ...adminPanel.form.formData,
          name: result.name,
          description: result.description,
        });

        // console.log(adminContext?.panel.form.formData)
        // adminContext.query.refresh();
      },
    },
  ],
  query: {
    getAll: async function (
      _options: AdminPanelQueryOptions,
      _overrideOptions?: AdminPanelQueryOptions,
    ): Promise<GetAllResponse<BUIAuthor>> {
      return adminPanelQueryResponseAll({
        data: await buiDatabase.authors.toArray(),
      });
    },
    getOne: async function (
      id: string | number,
    ): Promise<BUIAuthor | undefined> {
      return await buiDatabase.authors.get(Number(id));
    },
  },
  mutation: {
    create: async function (
      data: BUIAuthor,
    ): Promise<AdminPanelResult<BUIAuthor, unknown>> {
      const id = await buiDatabase.authors.add(data);

      return adminPanelResultSuccess<BUIAuthor>(
        (await buiDatabase.authors.get(id)) as BUIAuthor,
      );
    },
    update: async function (
      id: AdminPanelId,
      data: BUIAuthor,
    ): Promise<AdminPanelResult<BUIAuthor, unknown> | undefined> {
      if (typeof id !== "number") {
        throw new Error("Invalid ID type. Expected a number.");
      }

      await buiDatabase.authors.update(id, data);

      return adminPanelResultSuccess<BUIAuthor>(
        (await buiDatabase.authors.get(id)) as BUIAuthor,
      );
    },
    delete: async function (
      iid: AdminPanelId,
    ): Promise<AdminPanelResult<BUIAuthor, unknown> | undefined> {
      const id = Number(iid);
      await buiDatabase.authors.delete(id);

      return adminPanelResultSuccess<BUIAuthor>(
        (await buiDatabase.authors.get(id)) as BUIAuthor,
      );
    },
  },
};
