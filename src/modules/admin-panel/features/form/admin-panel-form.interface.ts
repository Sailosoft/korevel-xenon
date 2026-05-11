import { AdminPanelMutation } from "../mutation/admin-panel-mutation.interface";
import { AdminPanelQuery } from "../query/admin-panel-query.interface";

export type AdminPanelFormMode = "create" | "update" | "view" | "plain";

export type AdminPanelFormError = Record<string, string> | null;

export interface AdminPanelFormPlugin<T = any> {
  onSuccess?: (data: T, mode: AdminPanelFormMode) => void;
  onError?: (error: Error, mode: AdminPanelFormMode) => void;
  onBeforeSubmit?: (data: T, mode: AdminPanelFormMode) => T | Promise<T>;
  onAfterSubmit?: (data: T, mode: AdminPanelFormMode) => void;
}

export interface UseAdminPanelFormProps<TForm = any> {
  mode: AdminPanelFormMode;
  mutation: AdminPanelMutation<TForm>;
  query?: Pick<AdminPanelQuery<TForm>, "getOne">;
  initialData?: Partial<TForm>;
  id?: string | number;
  plugin?: AdminPanelFormPlugin<TForm>;
  onSuccess?: (data: TForm) => void;
  onError?: (error: Error) => void;
}

export interface UseAdminPanelForm<TForm = any> {
  formData: TForm;
  formError: AdminPanelFormError;
  setFormData: (data: TForm | ((prev: TForm) => TForm)) => void;
  isLoading: boolean;
  isSubmitting: boolean;
  error: Error | null;
  setFormError: (data: AdminPanelFormError) => void;
  clearFormError: () => void;

  submit: () => Promise<void>;
  resetForm: () => void;
  loadData: () => Promise<void>;
}
