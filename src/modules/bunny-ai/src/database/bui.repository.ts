import { AdminPanelQueryOptions } from "@/src/modules/admin-panel/features/query/admin-panel-query.interface";
import { Table } from "dexie";
import { BuiRepositoryResult } from "./bui.repository.interface";
import { BUIRepositoryResultManager } from "./bui.repository.result-manager";
import { AdminPanelId } from "@/src/modules/admin-panel/features/id/admin-panel-id.interface";

export class BUIRepository<T> {
  set: Table<T>;
  result: BUIRepositoryResultManager<T>;

  constructor(table: Table) {
    this.set = table;
    this.result = new BUIRepositoryResultManager<T>();
  }

  async getList(
    _options: AdminPanelQueryOptions,
  ): Promise<BuiRepositoryResult<T[]>> {
    const data = await this.set.toArray();

    return this.result.successList(data);
  }

  async get(id: AdminPanelId): Promise<BuiRepositoryResult<T>> {
    const data = await this.set.get(id);

    if (data == undefined) {
      return this.result.error(404, "Data can't be found.");
    }

    return this.result.success(data);
  }

  async create(data: T): Promise<BuiRepositoryResult<T>> {
    const id = await this.set.add(data);

    return await this.get(id);
  }

  async update(id: AdminPanelId, data: T): Promise<BuiRepositoryResult<T>> {
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

  async delete(id: AdminPanelId): Promise<BuiRepositoryResult> {
    await this.set.delete(id);

    return this.result.successType(undefined);
  }
}
