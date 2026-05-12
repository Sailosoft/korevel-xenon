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

export interface GetAllResponse<TRow> {
  data: TRow[];
  pagination: AdminPanelPagination;
  [key: string]: unknown;
}

export interface AdminPanelQuery<TRow, TForm = any> {
  getAll: (
    options: AdminPanelQueryOptions,
    overrideOptions?: AdminPanelQueryOptions,
  ) => Promise<GetAllResponse<TRow>>;
  getOne: (id: string | number) => Promise<TForm>;
}
