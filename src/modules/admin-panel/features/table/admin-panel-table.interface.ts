import {
  AdminPanelFilterOption,
  AdminPanelPagination,
  AdminPanelQuery,
  AdminPanelQueryOptions,
  AdminPanelSearchOption,
  AdminPanelSortOption,
} from "../query/admin-panel-query.interface";

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

export interface UseAdminPanelTable<T> {
  rows: T[];
  isLoading: boolean;
  pagination: AdminPanelPagination;
  sorts: AdminPanelSortOption[];
  filters: AdminPanelFilterOption[];
  search: AdminPanelSearchOption;
  queryOptions: AdminPanelQueryOptions;
  fetchData: () => Promise<void>;
  resetToDefault: () => void;
  setSorts: (sort: AdminPanelSortOption[]) => void;
  setFilters: (filters: AdminPanelFilterOption[]) => void;
  setSearch: (search: AdminPanelSearchOption) => void;
  setPagination: (pagination: AdminPanelPagination) => void;
  setQueryOptions: (queryOptions: AdminPanelQueryOptions) => void;
  setRows: (rows: T[]) => void;
  loadingOn: () => void;
  loadingOff: () => void;

  clearQueryOptions: () => void;
  removeFilters(): void;
  removeSorts(): void;
  removeSearch(): void;
  setPage(page: number): void;
  setPageSize(pageSize: number): void;
}
