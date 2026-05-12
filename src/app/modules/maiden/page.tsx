"use client";

import { AdminPanelMutation } from "@/src/modules/admin-panel/features/mutation/admin-panel-mutation.interface";
import {
  AdminPanelQuery,
  AdminPanelQueryOptions,
  GetAllResponse,
} from "@/src/modules/admin-panel/features/query/admin-panel-query.interface";
import { AdminPanelResult } from "@/src/modules/admin-panel/shared/admin-panel-result";
import Bunny from "@/src/modules/bunny/src/Bunny";
import { BunnyConfig } from "@/src/modules/bunny/src/Bunny.Interface";
import { useBunnyHeaderActions } from "@/src/modules/bunny/src/header/BunnyHeader.Action.Default";
import { Button } from "@heroui/react";

import { Edit, PlusIcon } from "lucide-react";
import { useMemo } from "react";

export default function MaidenPage() {
  const query: AdminPanelQuery<any, any> = {
    getOne: function (id: string | number): Promise<any> {
      console.log("getOne", id);
      return Promise.resolve({});
    },
    getAll: function (
      options: AdminPanelQueryOptions,
      overrideOptions?: AdminPanelQueryOptions,
    ): Promise<GetAllResponse<any>> {
      const response: GetAllResponse<any> = {
        data: [
          {
            id: "1",
            firstName: "John",
            lastName: "Doe",
          },
          {
            id: "2",
            firstName: "Jane",
            lastName: "Doe",
          },
        ],
        pagination: {
          page: 0,
          pageSize: 0,
          total: 0,
          totalPages: 0,
        },
      };
      return Promise.resolve(response);
    },
  };
  const mutation: AdminPanelMutation<any> = {
    create: function (
      data: any,
    ): Promise<AdminPanelResult<any, unknown> | undefined> {
      const response: AdminPanelResult<any, unknown> = {
        status: "success",
        data: {},
        message: "Success",
      };
      return Promise.resolve(response);
    },
    update: function (
      id: string | number,
      data: any,
    ): Promise<AdminPanelResult<any, unknown> | undefined> {
      const response: AdminPanelResult<any, unknown> = {
        status: "success",
        data: {},
        message: "Success",
      };
      return Promise.resolve(response);
    },
    delete: function (
      id: string | number,
    ): Promise<AdminPanelResult<any, unknown> | undefined> {
      const response: AdminPanelResult<any, unknown> = {
        status: "success",
        data: {},
        message: "Success",
      };
      return Promise.resolve(response);
    },
  };
  const actions = useBunnyHeaderActions([]);
  const config = useMemo<BunnyConfig<any, any>>(() => {
    return {
      title: "Maiden",
      rowKey: "id",
      titlePlural: "Maidens",
      columns: [
        {
          field: "id",
          header: "Id",
          sortable: true,
          isRowHeader: true,
        },
        {
          field: "firstName",
          header: "First Name",
          sortable: true,
        },
        {
          field: "lastName",
          header: "Last Name",
          sortable: true,
        },
      ],
      rowActions: [
        {
          // label: "Edit",
          icon: <Edit />,
          variant: "primary",
          onClick: (row) => {
            console.log("edit", row);
          },
        },
      ],
      headerActions: actions,
      query,
      mutation,
    };
  }, []);
  return (
    <Bunny config={config}>
      <div>Test</div>
      <div>Test</div>
    </Bunny>
  );
}
