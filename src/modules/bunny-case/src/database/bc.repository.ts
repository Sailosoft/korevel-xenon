// bc.repository.ts
//
// Base Dexie-backed repository used by every BunnyCase module. It deliberately
// avoids `useLiveQuery` (per project rules) — callers read data imperatively
// and manage their own reactivity.

import { AdminPanelQueryOptions } from "@/src/modules/admin-panel/features/query/admin-panel-query.interface";
import { Table } from "dexie";
import { AdminPanelId } from "@/src/modules/admin-panel/features/id/admin-panel-id.interface";
import { BCRepositoryResult } from "./bc.repository.interface";
import { BCRepositoryResultManager } from "./bc.repository.result-manager";

export class BCRepository<T> {
  set: Table<T>;
  result: BCRepositoryResultManager<T>;

  constructor(table: Table) {
    this.set = table;
    this.result = new BCRepositoryResultManager<T>();
  }

  async getList(
    _options: AdminPanelQueryOptions,
  ): Promise<BCRepositoryResult<T[]>> {
    const data = (await this.set.toArray()).reverse();

    return this.result.successList(data);
  }

  async get(id: AdminPanelId): Promise<BCRepositoryResult<T>> {
    const data = await this.set.get(id);

    if (data == undefined) {
      return this.result.error(404, "Data can't be found.");
    }

    return this.result.success(data);
  }

  async create(data: T): Promise<BCRepositoryResult<T>> {
    const id = await this.set.add(data);

    return await this.get(id);
  }

  async update(id: AdminPanelId, data: T): Promise<BCRepositoryResult<T>> {
    const result = await this.get(id);

    if (result.isSuccess) {
      const payload = {
        ...result.value,
        ...data,
      };
      await this.set.put(payload);

      return this.result.success(payload);
    }

    return result;
  }

  async delete(id: AdminPanelId): Promise<BCRepositoryResult> {
    await this.set.delete(Number(id));

    return this.result.successType(undefined);
  }
}
