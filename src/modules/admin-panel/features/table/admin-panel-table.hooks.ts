import { useState, useCallback, useEffect, useMemo } from "react";
import {
  AdminPanelPagination,
  AdminPanelSortOption,
  AdminPanelFilterOption,
  AdminPanelSearchOption,
  AdminPanelQueryOptions,
} from "../query/admin-panel-query.interface";
import {
  UseAdminPanelTable,
  UseAdminPanelTableProps,
} from "./admin-panel-table.interface";

export function useAdminPanelTable<T>({
  query,
  initialQuery,
  defaultQuery,
}: UseAdminPanelTableProps<T>): UseAdminPanelTable<T> {
  // Default values
  const getDefaultPagination = (): AdminPanelPagination => ({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  });

  const getDefaultSearch = (): AdminPanelSearchOption => ({ search: "" });

  const [rows, setRows] = useState<T[]>([]);
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

  const queryOptions = useMemo<AdminPanelQueryOptions>(
    () => ({
      pagination,
      sort: sorts.length > 0 ? sorts : undefined,
      filter: filters.length > 0 ? filters : undefined,
      search: search.search.trim() ? search : undefined,
    }),
    [pagination, sorts, filters, search, initialQuery],
  );

  const loadingOn = useCallback(() => setIsLoading(true), []);
  const loadingOff = useCallback(() => setIsLoading(false), []);

  const fetchData = useCallback(async () => {
    if (!query?.getAll) return;

    loadingOn();
    try {
      const result = await query.getAll(queryOptions);

      setRows(result.data || []);
      setPaginationState((prev) => ({
        ...prev,
        total: result.total || 0,
        totalPages: Math.ceil((result.total || 0) / prev.pageSize),
      }));
    } catch (error) {
      console.error("AdminPanelTable fetch error:", error);
      setRows([]);
    } finally {
      loadingOff();
    }
  }, [query, queryOptions, loadingOn, loadingOff]);

  // Auto fetch when query options change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setPagination = useCallback((newPagination: AdminPanelPagination) => {
    setPaginationState(newPagination);
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

  const removeFilters = useCallback(() => setFiltersState([]), []);
  const removeSorts = useCallback(() => setSortsState([]), []);
  const removeSearch = useCallback(
    () => setSearchState(getDefaultSearch()),
    [],
  );

  const resetToDefault = useCallback(() => {
    setPaginationState(defaultQuery?.pagination || getDefaultPagination());
    setSortsState(defaultQuery?.sort || []);
    setFiltersState(defaultQuery?.filter || []);
    setSearchState(defaultQuery?.search || getDefaultSearch());
  }, [defaultQuery]);

  const clearQueryOptions = useCallback(() => {
    setPaginationState(defaultQuery?.pagination || getDefaultPagination());
    setSortsState(defaultQuery?.sort || []);
    setFiltersState(defaultQuery?.filter || []);
    setSearchState(defaultQuery?.search || getDefaultSearch());
  }, [defaultQuery]);

  return {
    rows,
    isLoading,
    pagination,
    sorts,
    filters,
    search,
    queryOptions,
    clearQueryOptions,
    fetchData,
    resetToDefault,
    setSorts,
    setFilters,
    setSearch,
    setPagination,
    setQueryOptions,
    setRows,
    loadingOn,
    loadingOff,
    removeFilters,
    removeSorts,
    removeSearch,
    setPage,
    setPageSize,
  };
}
