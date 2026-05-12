import { AdminPanelMutation } from "../mutation/admin-panel-mutation.interface";
import { AdminPanelQuery } from "../query/admin-panel-query.interface";

export type AdminPanelFormMode = "create" | "update" | "view" | "plain";

export type AdminPanelFormError = Record<string, string> | null;

export interface UseAdminPanelFormProps<TForm = any> {
  mode?: AdminPanelFormMode;
  mutation: AdminPanelMutation<TForm>;
  query?: Pick<AdminPanelQuery<TForm>, "getOne">;
  initialData?: Partial<TForm>;
  id?: string | number;
  onSuccess?: (data: TForm) => void;
  onError?: (error: Error) => void;
}

export type UseAdminPanelFormPropsWithoutQueryMutation<TForm> = Omit<
  UseAdminPanelFormProps<TForm>,
  "query" | "mutation"
>;

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
  handleChange: (field: string, data: any) => void;
}
