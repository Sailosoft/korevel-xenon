// phaze.repository.ts
import { v7 as uuidv7 } from "uuid";
import { Table } from "dexie";
import { AdminPanelId } from "@/src/modules/admin-panel/features/id/admin-panel-id.interface";
import {
  AdminPanelQueryOptions,
  GetAllResponse,
} from "@/src/modules/admin-panel/features/query/admin-panel-query.interface";
import { AdminPanelResult } from "@/src/modules/admin-panel/shared/admin-panel-result";
import {
  IPhazeRepository,
  IPhazeRepositoryQueries,
  IPhazeRepositoryMutations,
} from "./types/PhazeRepository.Types";
import { PhazeRepositoryResult } from "./types/PhazeResult.Types";
import { PhazeRepositoryResultManager } from "./PhazeResultManager";

export class PhazeRepository<TRow, TForm = TRow> implements IPhazeRepository<TRow, TForm> {
  protected set: Table<TRow>;
  protected result: PhazeRepositoryResultManager<TRow>;

  // Public exposed namespaces grouped by intent
  public query: IPhazeRepositoryQueries<TRow>;
  public mutation: IPhazeRepositoryMutations<TRow, TForm>;

  public dataLayer: {
    query: IPhazeRepositoryQueries<TRow>;
    mutation: IPhazeRepositoryMutations<TRow, TForm>;
  };

  constructor(table: Table<TRow>) {
    this.set = table;
    this.result = new PhazeRepositoryResultManager<TRow>();

    // Bind namespaces to maintain correct 'this' context effortlessly
    this.query = this.initQueries();
    this.mutation = this.initMutations();

    this.dataLayer = {
      query: this.initQueries(),
      mutation: this.initMutations(),
    };
  }

  // --- INTERNAL CORE OPERATIONS (Merged from base bui.repository) ---

  public async getList(
    _options: AdminPanelQueryOptions,
  ): Promise<PhazeRepositoryResult<TRow[]>> {
    const data = await this.set.toArray(); //
    return this.result.successList(data); //
  }

  public async get(id: AdminPanelId): Promise<PhazeRepositoryResult<TRow>> {
    const data = await this.set.get(id); //
    if (data === undefined) {
      return this.result.error(404, "Data can't be found."); //
    }
    return this.result.success(data); //
  }

  public async create(data: TForm): Promise<PhazeRepositoryResult<TRow>> {
    // Only inject UUID v7 for tables that use a manual (non-auto-increment) primary key.
    // Dexie's IndexSpec.auto indicates whether the primary key is auto-incremented ("++id").
    const isAutoIncrement = this.set.schema.primKey.auto === true;

    if (!isAutoIncrement) {
      const entity = data as Record<string, unknown>;
      if (entity["id"] === undefined || entity["id"] === null) {
        entity["id"] = uuidv7();
      }
    }

    const id = await this.set.add(data as unknown as TRow); //
    return await this.get(id); //
  }

  public async update(
    id: AdminPanelId,
    data: TForm,
  ): Promise<PhazeRepositoryResult<TRow>> {
    const result = await this.get(id); //
    if (result.isSuccess) {
      const payload = { ...result.value, ...data } as unknown as TRow; //
      await this.set.put(payload); //
      return this.result.success(payload); //
    }
    return result; //
  }

  public async delete(id: AdminPanelId): Promise<PhazeRepositoryResult> {
    await this.set.delete(id as string); //
    return this.result.successType(undefined); //
  }

  // --- NAMESPACE INITIALIZERS ---

  private initQueries(): IPhazeRepositoryQueries<TRow> {
    return {
      getOne: async (id: AdminPanelId): Promise<TRow> => {
        const result = await this.get(id); //
        if (result.isSuccess) return result.value; //
        throw new Error(result.error.message); //
      },

      getAll: async (
        options: AdminPanelQueryOptions,
        overrideOptions?: AdminPanelQueryOptions,
      ): Promise<GetAllResponse<TRow>> => {
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
      },
    };
  }

  private initMutations(): IPhazeRepositoryMutations<TRow, TForm> {
    return {
      create: async (data: TForm): Promise<AdminPanelResult<TRow, unknown>> => {
        const result = await this.create(data); //
        if (result.isSuccess) {
          return { status: "success", data: result.value }; //
        }
        throw new Error(result.error.message); //
      },

      update: async (
        id: AdminPanelId,
        data: TForm,
      ): Promise<AdminPanelResult<TRow, unknown>> => {
        const result = await this.update(id, data); //
        if (result.isSuccess) {
          return { status: "success", data: result.value }; //
        }
        throw new Error(result.error.message); //
      },

      delete: async (
        id: AdminPanelId,
      ): Promise<AdminPanelResult<TRow, unknown>> => {
        const result = await this.delete(id); //
        if (result.isSuccess) {
          return { status: "success" }; //
        }
        throw new Error(result.error.message); //
      },
    };
  }
}
