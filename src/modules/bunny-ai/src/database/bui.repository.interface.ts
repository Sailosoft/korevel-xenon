import { AdminPanelId } from "@/src/modules/admin-panel/features/id/admin-panel-id.interface";
import {
  AdminPanelQueryOptions,
  GetAllResponse,
} from "@/src/modules/admin-panel/features/query/admin-panel-query.interface";
import { AdminPanelResult } from "@/src/modules/admin-panel/shared/admin-panel-result";

type ErrorPayload = { code: number; message: string };

export type BuiRepositoryResult<T = undefined, E = ErrorPayload> =
  | { isSuccess: true; value: T }
  | { isSuccess: false; value?: unknown; error: E };

export interface IBUIRepositoryAdminPanel<T> {
  panelGetOne(id: AdminPanelId): Promise<T>;
  panelGetAll(
    options: AdminPanelQueryOptions,
    overrideOptions?: AdminPanelQueryOptions,
  ): Promise<GetAllResponse<T>>;
  panelCreate(data: T): Promise<AdminPanelResult<T, unknown>>;
  panelUpdate(id: AdminPanelId, data: T): Promise<AdminPanelResult<T, unknown>>;
  panelDelete(id: AdminPanelId): Promise<AdminPanelResult<T, unknown>>;
}
