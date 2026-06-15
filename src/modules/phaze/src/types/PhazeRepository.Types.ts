// phaze.repository.interface.ts
import { AdminPanelId } from "@/src/modules/admin-panel/features/id/admin-panel-id.interface";
import {
  AdminPanelQueryOptions,
  GetAllResponse,
} from "@/src/modules/admin-panel/features/query/admin-panel-query.interface";
import { AdminPanelResult } from "@/src/modules/admin-panel/shared/admin-panel-result";
import { PhazeRepositoryResult } from "./PhazeResult.Types";

export interface IPhazeRepositoryQueries<T> {
  getOne(id: AdminPanelId): Promise<T>;
  getAll(
    options: AdminPanelQueryOptions,
    overrideOptions?: AdminPanelQueryOptions,
  ): Promise<GetAllResponse<T>>;
}

export interface IPhazeRepositoryMutations<T> {
  create(data: T): Promise<AdminPanelResult<T, unknown>>;
  update(id: AdminPanelId, data: T): Promise<AdminPanelResult<T, unknown>>;
  delete(id: AdminPanelId): Promise<AdminPanelResult<T, unknown>>;
}

export interface IPhazeRepository<T> {
  getList(
    _options: AdminPanelQueryOptions,
  ): Promise<PhazeRepositoryResult<T[]>>;
  get(id: AdminPanelId): Promise<PhazeRepositoryResult<T>>;
  create(data: T): Promise<PhazeRepositoryResult<T>>;
  update(id: AdminPanelId, data: T): Promise<PhazeRepositoryResult<T>>;
  delete(id: AdminPanelId): Promise<PhazeRepositoryResult>;
  query: IPhazeRepositoryQueries<T>;
  mutation: IPhazeRepositoryMutations<T>;
  dataLayer: {
    query: IPhazeRepositoryQueries<T>;
    mutation: IPhazeRepositoryMutations<T>;
  };
}
