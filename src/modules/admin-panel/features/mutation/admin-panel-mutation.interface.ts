import { AdminPanelResult } from "../../shared/admin-panel-result";

export interface AdminPanelMutation<T> {
  create: (
    data: any,
  ) => Promise<AdminPanelResult<T, Error | unknown> | undefined>;
  update: (
    id: string | number,
    data: any,
  ) => Promise<AdminPanelResult<T, Error | unknown> | undefined>;
  delete: (
    id: string | number,
  ) => Promise<AdminPanelResult<T, Error | unknown> | undefined>;
}

export type AdminPanelCreateMutation<T> = Omit<
  AdminPanelMutation<T>,
  "update" | "delete"
>;
export type AdminPanelUpdateMutation<T> = Omit<
  AdminPanelMutation<T>,
  "create" | "delete"
>;
export type AdminPanelDeleteMutation<T> = Omit<
  AdminPanelMutation<T>,
  "create" | "update"
>;

export interface UseAdminPanelCreateProps<T> {
  mutation: AdminPanelCreateMutation<T>;
  onSuccess?: (data?: T) => void;
  onError?: (error: Error) => void;
}

export interface UseAdminPanelUpdateProps<T> {
  mutation: AdminPanelUpdateMutation<T>;
  onSuccess?: (data?: T) => void;
  onError?: (error: Error) => void;
}

export interface UseAdminPanelDeleteProps<T> {
  mutation: AdminPanelDeleteMutation<T>;
  onSuccess?: (data?: T) => void;
  onError?: (error: Error) => void;
}

export interface UseAdminPanelMutations<T> {
  create: (
    data: any,
  ) => Promise<AdminPanelResult<T, Error | unknown> | undefined>;
  update: (
    id: string | number,
    data: any,
  ) => Promise<AdminPanelResult<T, Error | unknown> | undefined>;
  delete: (
    id: string | number,
  ) => Promise<AdminPanelResult<T, Error | unknown> | undefined>;
}
