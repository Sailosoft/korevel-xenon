import { AdminPanelQueryOptions, GetAllResponse } from "@/src/modules/admin-panel/features/query/admin-panel-query.interface";
import { AdminPanelId } from "@/src/modules/admin-panel/features/id/admin-panel-id.interface";
import { AdminPanelResult } from "@/src/modules/admin-panel/shared/admin-panel-result";
import { BunnyConfig } from "@/src/modules/bunny/src/Bunny.Interface";

interface BUISettingsModule {
  key: string;
  type: "text";
  value: "string";
}

export const buiSettingsModule: BunnyConfig<BUISettingsModule, BUISettingsModule> = {
  title: "Bunny AI Setting",
  columns: [
    {
      field: "key",
      header: "Key",
      sortable: true,
      isRowHeader: true,
    },
    {
      field: "value",
      header: "Value"
    }
  ],
  rowKey: "key",
  query: {
    getAll: function (options: AdminPanelQueryOptions, overrideOptions?: AdminPanelQueryOptions): Promise<GetAllResponse<BUISettingsModule>> {
      throw new Error("Function not implemented.");
    },
    getOne: function (id: string | number): Promise<BUISettingsModule | undefined> {
      throw new Error("Function not implemented.");
    }
  },
  mutation: {
    create: function (data: BUISettingsModule): Promise<AdminPanelResult<BUISettingsModule, unknown> | undefined> {
      throw new Error("Function not implemented.");
    },
    update: function (id: AdminPanelId, data: BUISettingsModule): Promise<AdminPanelResult<BUISettingsModule, unknown> | undefined> {
      throw new Error("Function not implemented.");
    },
    delete: function (id: AdminPanelId): Promise<AdminPanelResult<BUISettingsModule, unknown> | undefined> {
      throw new Error("Function not implemented.");
    }
  }
}