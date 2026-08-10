// bc.repository.admin-panel.ts
//
// Adapts `BCRepository` to the shared admin-panel / Bunny data-layer contract
// (`IBUIRepositoryAdminPanel`-style). CRUD through Bunny resolves to these
// methods, which delegate to the Dexie table.

import { Table } from "dexie";
import { BCRepository } from "./bc.repository";
import { IBCRepositoryAdminPanel } from "./bc.repository.interface";
import { AdminPanelId } from "@/src/modules/admin-panel/features/id/admin-panel-id.interface";
import {
  AdminPanelQueryOptions,
  GetAllResponse,
} from "@/src/modules/admin-panel/features/query/admin-panel-query.interface";
import { AdminPanelResult } from "@/src/modules/admin-panel/shared/admin-panel-result";

export default class BCRepositoryAdminPanel<T>
  extends BCRepository<T>
  implements IBCRepositoryAdminPanel<T>
{
  constructor(table: Table<T>) {
    super(table);
  }

  async panelGetOne(id: AdminPanelId): Promise<T> {
    const result = await this.get(id);
    if (result.isSuccess) {
      return result.value;
    }

    throw new Error(result.error.message);
  }

  async panelGetAll(
    options: AdminPanelQueryOptions,
    overrideOptions?: AdminPanelQueryOptions,
  ): Promise<GetAllResponse<T>> {
    const opt = options;

    if (overrideOptions) {
      Object.assign(opt, overrideOptions);
    }

    const result = await this.getList(opt);

    if (result.isSuccess) {
      const response: GetAllResponse<T> = {
        data: result.value,
        pagination: {
          total: result.value.length,
          page: 0,
          pageSize: 0,
          totalPages: 0,
        },
      };

      return response;
    }

    throw new Error(result.error.message);
  }

  async panelCreate(data: T): Promise<AdminPanelResult<T, unknown>> {
    const result = await this.create(data);

    if (result.isSuccess) {
      const res: AdminPanelResult<T, unknown> = {
        status: "success",
        data: result.value,
      };

      return res;
    }

    throw new Error(result.error.message);
  }

  async panelUpdate(
    id: AdminPanelId,
    data: T,
  ): Promise<AdminPanelResult<T, unknown>> {
    const result = await this.update(id, data);

    if (result.isSuccess) {
      const res: AdminPanelResult<T, unknown> = {
        status: "success",
        data: result.value,
      };

      return res;
    }

    throw new Error(result.error.message);
  }

  async panelDelete(id: AdminPanelId): Promise<AdminPanelResult<T, unknown>> {
    const result = await this.delete(id);

    if (result.isSuccess) {
      const res: AdminPanelResult<T, unknown> = {
        status: "success",
      };

      return res;
    }

    throw new Error(result.error.message);
  }
}
