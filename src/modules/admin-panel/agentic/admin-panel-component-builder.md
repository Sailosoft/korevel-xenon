# AdminPanel Component Builder

## Description

- This instruction is to create component or implementation side for react admin panel component builder of choice of framework. that will apply admin panel hooks and provider.

## Task

### Base Configuration

- Create a base configuration that accepts
- Title
- TitlePlural
- Columns: Interface does not has depency on other framework
- Capable to output the column definition
- render custom component
- RowActions
- AdminPanelMutations
- AdminPanelQueries
- Etc
- Create a Adapter that will translate to the base framework implementation. this will make it easy to port to different framework
- ColumnAdapter - that will work for table columns
- NotificationAdapter - that will work for notifications/snackbar

### Main Panel

- Create me component and sub children component that accepts the configuration
- MainPanel
- {PrefixName}MainPanel
- Uses The Context Provider
- Uses Adapter to render specified component(config-implementation) for notify and columns
- Usaged Children of its component
- Support custom row actions
- Addional Custom Header Buttons for admin panel (refresh, delete, export, import, custom action)

### SubComponent

- SubComponents
- {PrefixName}Header: Title and extra buttons(add, refresh, delete, export, import, custom action)
- {PrefixName}Table
- {PrefixName}Modal
- {PrefixName}Form: This parameter is for children.
- {PrefixName}Notification: this to create custom notification for specified framework
- {PrefixName}Delete: Delete implementation

## Structure

- Base
- It uses admin panel provider and receive hooks

## Dependencies:

- AdminPanel
- Path: "@admin-panel/_": ["./src/modules/admin-panel/_"]

## Inputs

- Ask User What Base Framework will be built from (Material, HeroUI and etc)?
- What is the Prefix Name used (e.g: Korevel, Xenon, etc.)?

## Outputs

- Generate the file structure using referencing admin panel interfaces and provider
- Generate the files with Prefix Name using the input above (e.g. {PrefixName}{Component}.tsx and etc)

## Usage Example

```typescript
const config: {Prefix}Config = {
    title: "Module",
    /// so on
    columns: []
}

return (
    <{PrefixName}MainPanel config={config}>
    </ Pref
)
```

## Reference Typescript For Admin Panel

```typescript
export function AdminPanelProvider<TRow, TForm = any>({
  children,
  query,
  mutation,
  props,
}: AdminPanelProviderProps<TRow, TForm>) {
  const value = useAdminPanel<TRow, TForm>({
    query,
    mutation,
    props,
  });

  return (
    <AdminPanelContext.Provider value={value}>
      {children}
    </AdminPanelContext.Provider>
  );
}

export interface AdminPanelProviderProps<
  TRow,
  TForm,
> extends UseAdminPanelProps<TRow, TForm> {
  children: ReactNode;
}


export interface UseAdminPanel<TRow, TForm> {
  form: UseAdminPanelForm<TForm>;
  table: UseAdminPanelTable<TRow>;
  modal: UseAdminPanelModal;
  notify: UseAdminPanelNotify;
  del: UseAdminPanelDelete<TRow>;
}

export interface UseAdminPanelProps<TRow, TForm> {
  query: AdminPanelQuery<TRow, TForm>;
  mutation: AdminPanelMutation<TForm>;
  props?: {
    table?: Partial<UseAdminPanelTablePropsWithoutQuery<TRow>>;
    form?: Partial<UseAdminPanelFormPropsWithoutQueryMutation<TForm>>;
    notify?: Partial<UseAdminPanelNotifyProps>;
  };
}


export interface AdminPanelQuery<TRow, TForm = any> {
  getAll: (
    options: AdminPanelQueryOptions,
    overrideOptions?: AdminPanelQueryOptions,
  ) => Promise<{
    data: TRow[];
    total: number;
    [key: string]: unknown;
  }>;
  getOne: (id: string | number) => Promise<TForm>;
}
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

export interface UseAdminPanelDeleteProps<TRow = any, TForm = any> {
  mutation: AdminPanelMutation<TForm>; // or AdminPanelDeleteMutation<T>
  table: UseAdminPanelTable<TRow>;
  modal: UseAdminPanelModal;
  notify?: UseAdminPanelNotify;
  successMessage?: string;
  confirmMessage?: (item: TRow) => string;
  itemName?: string;
}

export interface UseAdminPanelDelete<T = any> {
  isDeleting: boolean;
  error: Error | null;
  confirmMessage: (item: T) => string;

  // Main action
  deleteItem: (id: string | number) => Promise<void>;

  // Modal helpers
  openDeleteConfirm: (id: string | number) => void;
  closeDeleteModal: () => void;

  // Direct delete (headless)
  deleteWithoutConfirm: (id: string | number) => Promise<void>;
}


export interface AdminPanelFormPlugin<T = any> {
  onSuccess?: (data: T, mode?: AdminPanelFormMode) => void;
  onError?: (error: Error, mode?: AdminPanelFormMode) => void;
  onBeforeSubmit?: (data: T, mode?: AdminPanelFormMode) => T | Promise<T>;
  onAfterSubmit?: (data: T, mode?: AdminPanelFormMode) => void;
}

export interface UseAdminPanelFormProps<TForm = any> {
  mode?: AdminPanelFormMode;
  mutation: AdminPanelMutation<TForm>;
  query?: Pick<AdminPanelQuery<TForm>, "getOne">;
  initialData?: Partial<TForm>;
  id?: string | number;
  plugin?: AdminPanelFormPlugin<TForm>;
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
}


export interface AdminPanelModalState {
  isOpen: boolean;
  mode: AdminPanelFormMode;
}

export interface UseAdminPanelModal {
  // State
  isOpen: boolean;
  mode: AdminPanelFormMode;

  // Core Actions
  openModal: (mode: AdminPanelFormMode) => void;
  closeModal: () => void;

  // Convenience Methods (for table actions)
  openCreate: () => void;
  openUpdate: () => void;
  openView: () => void;
  openPlain: () => void;

  // Reset
  resetModal: () => void;
}

export type AdminPanelNotifyType =
  | "accent"
  | "default"
  | "success"
  | "warning"
  | "error"
  | "custom";

export interface AdminPanelNotifyOptions {
  type?: AdminPanelNotifyType;
  duration?: number; // in milliseconds
  position?:
    | "top"
    | "bottom"
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";
  actionLabel?: string;
  onAction?: () => void;
  [key: string]: any; // for custom options
}

export interface UseAdminPanelNotify {
  success: (
    message: string,
    options?: Omit<AdminPanelNotifyOptions, "type">,
  ) => void;
  error: (
    message: string,
    options?: Omit<AdminPanelNotifyOptions, "type">,
  ) => void;
  warning: (
    message: string,
    options?: Omit<AdminPanelNotifyOptions, "type">,
  ) => void;
  info: (
    message: string,
    options?: Omit<AdminPanelNotifyOptions, "type">,
  ) => void;
  show: (message: string, options?: AdminPanelNotifyOptions) => void;
}

export interface UseAdminPanelNotifyProps {
  // Optional adapter for different toast/snackbar libraries (Sonner, React Hot Toast, Material UI, etc.)
  adapter?: (message: string, options: AdminPanelNotifyOptions) => void;
}

type AdminPanelTableQuery<T> = Omit<AdminPanelQuery<T>, "getOne">;

export interface UseAdminPanelTableProps<T> {
  query: AdminPanelTableQuery<T>;
  initialQuery?: AdminPanelQueryOptions;
  defaultQuery?: AdminPanelQueryOptions;
  pageSelections?: Array<number | { label: string; value: number }>;
  pageSizeSelections?: Array<number | { label: string; value: number }>;
  hidePageSelection?: boolean;
  hidePageSizeSelection?: boolean;
  pageAll?: boolean;
}

export type UseAdminPanelTablePropsWithoutQuery<T> = Omit<
  UseAdminPanelTableProps<T>,
  "query"
>;

export interface UseAdminPanelTable<T> {
  rows: T[];
  isLoading: boolean;
  pagination: AdminPanelPagination;
  sorts: AdminPanelSortOption[];
  filters: AdminPanelFilterOption[];
  search: AdminPanelSearchOption;
  queryOptions: AdminPanelQueryOptions;
  fetchData: () => Promise<void>;
  clearQueryOptions: () => void;
  setSorts: (sort: AdminPanelSortOption[]) => void;
  setFilters: (filters: AdminPanelFilterOption[]) => void;
  setSearch: (search: AdminPanelSearchOption) => void;
  setPagination: (pagination: AdminPanelPagination) => void;
  setQueryOptions: (queryOptions: AdminPanelQueryOptions) => void;
  setRows: (rows: T[]) => void;
  loadingOn: () => void;
  loadingOff: () => void;
  removeFilters(): void;
  removeSorts(): void;
  removeSearch(): void;
  setPage(page: number): void;
  setPageSize(pageSize: number): void;
}
export interface AdminPanelPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export type AdminPanelSortDirection = "asc" | "desc";

export interface AdminPanelSortOption {
  field: string;
  direction: AdminPanelSortDirection;
}

export interface AdminPanelFilterOption {
  field: string;
  operator?: string;
  value: string;
}

export interface AdminPanelSearchOption {
  search: string;
}

export interface AdminPanelQueryOptions {
  pagination?: AdminPanelPagination;
  sort?: AdminPanelSortOption[];
  filter?: AdminPanelFilterOption[];
  search?: AdminPanelSearchOption;
  [key: string]: unknown;
}

```
