# AdminPanelForm Hooks

- This is powerful managing a form. It can be used for creating, updating, and viewing a data.
- It can relies to individual page form, modal maximizing usage of AdminPanelModal hooks, or recieve data from the data table itself.

## Generics

- TForm - generic value for defining form data

## Parameters

- AdminPanelMutation - Create Update operations integrating Data Layer Mutation
- AdminPanelQuery - Optional to Get One Operation integrating Data Layer Query.

## Features

- Has access to mode whether primaryAction will create or update
- It uses AdminPanelQuery.GetOne to pre-populate the form data when mode is update
- Optionally if you dont need to pre-populate the form it has to set form based on data already exising on adminpaneltable
- It has a way or parameters to receive a callback. such as SuccessOperation that can be used to close the modal, refetch data, and etc if in modal form.
- capable to refetch get one if not preloaded by data in table.
- It has capable to manage loading when pre-populating or primary action
- It has also capable to manage state of form data
- It has also capable to manage state of form validation that store to formError

## Plugins

- AdminPanelFormPlugin - Plugin to construct your behavior or hook in admin panel form life cycle such as default AdminPanelSnackbar - Refresh the Main Table - close modal. or plugin for standalone page that redirect to view then ?snackbar=success.

## Rules

- AdminPanelMutation - is not hook but an interface for api action it is abstraction call that can either use dexieJs or server action or drizzle.
- UseAdminPanelForm - consolidate all state to this hook
- make the useAdminPanelMutation and useAdminPanelForm consolidate in one use hooks

## Interfaces

```typescript
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
```
