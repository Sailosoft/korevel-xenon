// phaze.repository.interface.ts
import { AdminPanelId } from "@/src/modules/admin-panel/features/id/admin-panel-id.interface";
import {
  AdminPanelQueryOptions,
  GetAllResponse,
} from "@/src/modules/admin-panel/features/query/admin-panel-query.interface";
import { AdminPanelResult } from "@/src/modules/admin-panel/shared/admin-panel-result";
import { PhazeRepositoryResult } from "./PhazeResult.Types";

export interface IPhazeRepositoryQueries<TRow> {
  getOne(id: AdminPanelId): Promise<TRow>;
  getAll(
    options: AdminPanelQueryOptions,
    overrideOptions?: AdminPanelQueryOptions,
  ): Promise<GetAllResponse<TRow>>;
}

export interface IPhazeRepositoryMutations<TRow, TForm = TRow> {
  create(data: TForm): Promise<AdminPanelResult<TRow, unknown>>;
  update(id: AdminPanelId, data: TForm): Promise<AdminPanelResult<TRow, unknown>>;
  delete(id: AdminPanelId): Promise<AdminPanelResult<TRow, unknown>>;
}

export interface IPhazeRepository<TRow, TForm = TRow> {
  getList(
    _options: AdminPanelQueryOptions,
  ): Promise<PhazeRepositoryResult<TRow[]>>;
  get(id: AdminPanelId): Promise<PhazeRepositoryResult<TRow>>;
  create(data: TForm): Promise<PhazeRepositoryResult<TRow>>;
  update(id: AdminPanelId, data: TForm): Promise<PhazeRepositoryResult<TRow>>;
  delete(id: AdminPanelId): Promise<PhazeRepositoryResult>;
  query: IPhazeRepositoryQueries<TRow>;
  mutation: IPhazeRepositoryMutations<TRow, TForm>;
  dataLayer: {
    query: IPhazeRepositoryQueries<TRow>;
    mutation: IPhazeRepositoryMutations<TRow, TForm>;
  };
}
