// phaze.repository.ts
import { Table } from "dexie";
import { AdminPanelId } from "@/src/modules/admin-panel/features/id/admin-panel-id.interface";
import {
  AdminPanelQueryOptions,
  GetAllResponse,
} from "@/src/modules/admin-panel/features/query/admin-panel-query.interface";
import { AdminPanelResult } from "@/src/modules/admin-panel/shared/admin-panel-result";
import { IPhazeRepository, IPhazeRepositoryQueries, IPhazeRepositoryMutations } from "./types/PhazeRepository.Types";
import { PhazeRepositoryResult } from "./types/PhazeResult.Types";
import { PhazeRepositoryResultManager } from "./PhazeResultManager";

export class PhazeRepository<T> implements IPhazeRepository<T> {
  protected set: Table<T>;
  protected result: PhazeRepositoryResultManager<T>;

  // Public exposed namespaces grouped by intent
  public query: IPhazeRepositoryQueries<T>;
  public mutation: IPhazeRepositoryMutations<T>;

  constructor(table: Table<T>) {
    this.set = table;
    this.result = new PhazeRepositoryResultManager<T>();

    // Bind namespaces to maintain correct 'this' context effortlessly
    this.query = this.initQueries();
    this.mutation = this.initMutations();
  }

  // --- INTERNAL CORE OPERATIONS (Merged from base bui.repository) ---

  public async getList(_options: AdminPanelQueryOptions): Promise<PhazeRepositoryResult<T[]>> {
    const data = await this.set.toArray(); //
    return this.result.successList(data); //
  }

  public async get(id: AdminPanelId): Promise<PhazeRepositoryResult<T>> {
    const data = await this.set.get(id); //
    if (data === undefined) {
      return this.result.error(404, "Data can't be found."); //
    }
    return this.result.success(data); //
  }

  public async create(data: T): Promise<PhazeRepositoryResult<T>> {
    const id = await this.set.add(data); //
    return await this.get(id); //
  }

  public async update(id: AdminPanelId, data: T): Promise<PhazeRepositoryResult<T>> {
    const result = await this.get(id); //
    if (result.isSuccess) {
      const payload = { ...result.value, ...data }; //
      await this.set.put(payload); //
      return this.result.success(payload); //
    }
    return result; //
  }

  public async delete(id: AdminPanelId): Promise<PhazeRepositoryResult> {
    await this.set.delete(Number(id)); //
    return this.result.successType(undefined); //
  }

  // --- NAMESPACE INITIALIZERS ---

  private initQueries(): IPhazeRepositoryQueries<T> {
    return {
      panelGetOne: async (id: AdminPanelId): Promise<T> => {
        const result = await this.get(id); //
        if (result.isSuccess) return result.value; //
        throw new Error(result.error.message); //
      },

      panelGetAll: async (
        options: AdminPanelQueryOptions,
        overrideOptions?: AdminPanelQueryOptions
      ): Promise<GetAllResponse<T>> => {
        const opt = options; //
        if (overrideOptions) {
          Object.assign(opt, overrideOptions); //
        }
        const result = await this.getList(opt); //

        if (result.isSuccess) {
          return {
            data: result.value, //
            pagination: {
              total: result.value.length, //
              page: 0, //
              pageSize: 0, //
              totalPages: 0, //
            },
          };
        }
        throw new Error(result.error.message); //
      }
    };
  }

  private initMutations(): IPhazeRepositoryMutations<T> {
    return {
      panelCreate: async (data: T): Promise<AdminPanelResult<T, unknown>> => {
        const result = await this.create(data); //
        if (result.isSuccess) {
          return { status: "success", data: result.value }; //
        }
        throw new Error(result.error.message); //
      },

      panelUpdate: async (id: AdminPanelId, data: T): Promise<AdminPanelResult<T, unknown>> => {
        const result = await this.update(id, data); //
        if (result.isSuccess) {
          return { status: "success", data: result.value }; //
        }
        throw new Error(result.error.message); //
      },

      panelDelete: async (id: AdminPanelId): Promise<AdminPanelResult<T, unknown>> => {
        const result = await this.delete(id); //
        if (result.isSuccess) {
          return { status: "success" }; //
        }
        throw new Error(result.error.message); //
      }
    };
  }
}