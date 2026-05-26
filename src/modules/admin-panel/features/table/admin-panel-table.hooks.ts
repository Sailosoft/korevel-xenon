// src/modules/admin-panel/features/table/admin-panel-table.hooks.ts
import { useState, useCallback, useEffect, useMemo } from "react";
import {
  AdminPanelPagination,
  AdminPanelSortOption,
  AdminPanelFilterOption,
  AdminPanelSearchOption,
  AdminPanelQueryOptions,
} from "../query/admin-panel-query.interface";
import {
  AdminPanelSelectionMode,
  UseAdminPanelTable,
  UseAdminPanelTableProps,
} from "./admin-panel-table.interface";
import { AdminPanelId } from "../id/admin-panel-id.interface";

export function useAdminPanelTable<T>({
  query,
  initialQuery,
  defaultQuery,
}: UseAdminPanelTableProps<T>): UseAdminPanelTable<T> {
  const getDefaultPagination = (): AdminPanelPagination => ({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  });

  const getDefaultSearch = (): AdminPanelSearchOption => ({ search: "" });

  const [rows, setRows] = useState<T[]>([]);
  const [selectionMode, setSelectionMode] =
    useState<AdminPanelSelectionMode>("multiple");
  const [selection, setSelection] = useState<AdminPanelId[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [pagination, setPaginationState] = useState<AdminPanelPagination>(
    initialQuery?.pagination || getDefaultPagination(),
  );

  const [sorts, setSortsState] = useState<AdminPanelSortOption[]>(
    initialQuery?.sort || [],
  );
  const [filters, setFiltersState] = useState<AdminPanelFilterOption[]>(
    initialQuery?.filter || [],
  );
  const [search, setSearchState] = useState<AdminPanelSearchOption>(
    initialQuery?.search || getDefaultSearch(),
  );

  const queryPagination = useMemo<AdminPanelPagination>(
    () => ({
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: 0,
      totalPages: 0,
    }),
    [pagination.page, pagination.pageSize],
  );

  const queryOptions = useMemo<AdminPanelQueryOptions>(
    () => ({
      pagination: queryPagination,
      sort: sorts.length > 0 ? sorts : undefined,
      filter: filters.length > 0 ? filters : undefined,
      search: search.search?.trim() ? search : undefined,
    }),
    [queryPagination, sorts, filters, search.search],
  );

  const loadingOn = useCallback(() => setIsLoading(true), []);
  const loadingOff = useCallback(() => setIsLoading(false), []);

  const fetchData = useCallback(async () => {
    if (!query?.getAll) return;

    setIsLoading(true);
    try {
      const result = await query.getAll(queryOptions);

      setRows(result.data || []);

      const newTotal = Number(result.total) || 0;

      setPaginationState((prev) => ({
        ...prev,
        total: newTotal,
        totalPages: prev.pageSize > 0 ? Math.ceil(newTotal / prev.pageSize) : 0,
      }));
    } catch (error) {
      console.error("AdminPanelTable fetch error:", error);
      setRows([]);
    } finally {
      loadingOff();
    }
  }, [query, queryOptions, loadingOn, loadingOff]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ==================== Setters ====================

  const setPagination = useCallback((newPagination: AdminPanelPagination) => {
    setPaginationState(newPagination);
  }, []);

  const setPage = useCallback((page: number) => {
    setPaginationState((prev) => ({ ...prev, page: Math.max(1, page) }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setPaginationState((prev) => ({
      ...prev,
      pageSize: Math.max(1, pageSize),
      page: 1,
    }));
  }, []);

  const setSorts = useCallback((newSorts: AdminPanelSortOption[]) => {
    setSortsState(newSorts);
  }, []);

  const setFilters = useCallback((newFilters: AdminPanelFilterOption[]) => {
    setFiltersState(newFilters);
  }, []);

  const setSearch = useCallback((newSearch: AdminPanelSearchOption) => {
    setSearchState(newSearch);
  }, []);

  const setQueryOptions = useCallback((newOptions: AdminPanelQueryOptions) => {
    if (newOptions.pagination) setPaginationState(newOptions.pagination);
    if (newOptions.sort) setSortsState(newOptions.sort);
    if (newOptions.filter) setFiltersState(newOptions.filter);
    if (newOptions.search) setSearchState(newOptions.search);
  }, []);

  const removeFilters = useCallback(() => {
    setFiltersState([]);
  }, []);

  const removeSorts = useCallback(() => {
    setSortsState([]);
  }, []);

  const removeSearch = useCallback(() => {
    setSearchState(getDefaultSearch());
  }, []);

  const clearQueryOptions = useCallback(() => {
    setPaginationState(defaultQuery?.pagination || getDefaultPagination());
    setSortsState(defaultQuery?.sort || []);
    setFiltersState(defaultQuery?.filter || []);
    setSearchState(defaultQuery?.search || getDefaultSearch());
  }, [defaultQuery]);

  return {
    rows,
    selection,
    isLoading,
    pagination,
    sorts,
    filters,
    search,
    queryOptions,
    selectionMode,
    fetchData,
    setPagination,
    setPage,
    setPageSize,
    setSorts,
    setFilters,
    setSearch,
    setQueryOptions, // ← Added
    removeFilters, // ← Added
    removeSorts, // ← Added
    removeSearch, // ← Added
    clearQueryOptions,
    loadingOn,
    loadingOff,
    setRows,
    setSelectionMode,
    setSelection,
  };
}
