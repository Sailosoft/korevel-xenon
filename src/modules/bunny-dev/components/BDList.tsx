"use client";

// BDList — config-first data table.
//
// Features: column descriptors with custom renderers, client-side sorting,
// search, pagination, row actions, and bulk actions. No external table library
// so it stays themeable and serializable-config friendly.

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
  type LucideIcon,
} from "lucide-react";
import { TableVirtuoso, type ItemProps } from "react-virtuoso";
import { cn } from "@heroui/react";
import BDEmptyState, { type BDEmptyStateProps } from "./BDEmptyState";
import BDButton, { type BDButtonVariant } from "./BDButton";
import BDIconButton from "./BDIconButton";

export interface BDListColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  align?: "left" | "center" | "right";
  width?: string | number;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  className?: string;
}

export interface BDListAction<T> {
  label: string;
  icon?: LucideIcon;
  onSelect: (rows: T[]) => void;
  variant?: BDButtonVariant;
  isDisabled?: (rows: T[]) => boolean;
  /** Render only the icon (with a tooltip) instead of icon + label. */
  iconOnly?: boolean;
  /** Tooltip text for icon-only actions. Falls back to `label`. */
  tooltip?: string;
}

export interface BDListProps<T> {
  data: T[];
  columns: BDListColumn<T>[];
  getRowId: (row: T) => string;
  isLoading?: boolean;
  error?: string | null;
  emptyState?: BDEmptyStateProps;
  onRowClick?: (row: T) => void;
  rowActions?: BDListAction<T>[];
  bulkActions?: BDListAction<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  getSearchText?: (row: T) => string;
  pageSize?: number;
  title?: string;
  toolbar?: ReactNode;
  className?: string;
  /**
   * Opt-in virtual scrolling. When set, rows render in a fixed-height
   * `TableVirtuoso` scroller and pagination is disabled.
   */
  virtual?: { height: number };
}

type SortState = { key: string; direction: "asc" | "desc" } | null;

export function BDList<T>({
  data,
  columns,
  getRowId,
  isLoading = false,
  error = null,
  emptyState,
  onRowClick,
  rowActions,
  bulkActions,
  searchable = false,
  searchPlaceholder = "Search…",
  getSearchText,
  pageSize = 20,
  title,
  toolbar,
  className,
  virtual,
}: BDListProps<T>) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = useMemo(() => {
    if (!query.trim()) return data;
    const q = query.toLowerCase();
    return data.filter((row) => {
      const text = getSearchText ? getSearchText(row) : JSON.stringify(row);
      return text.toLowerCase().includes(q);
    });
  }, [data, query, getSearchText]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return filtered;
    const value = (row: T): string | number => {
      if (col.sortValue) return col.sortValue(row);
      const raw = (row as Record<string, unknown>)[col.key];
      if (typeof raw === "number") return raw;
      return String(raw ?? "");
    };
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sort.direction === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const paged = sorted.slice(
    currentPage * pageSize,
    currentPage * pageSize + pageSize,
  );
  const displayRows = virtual ? sorted : paged;

  const hasBulk = !!bulkActions && bulkActions.length > 0;
  const selectedRows = data.filter((row) => selected.includes(getRowId(row)));

  // Latest-ref so the memoized virtual row component stays stable while still
  // seeing the current click handler.
  const onRowClickRef = useRef(onRowClick);
  useEffect(() => {
    onRowClickRef.current = onRowClick;
  }, [onRowClick]);

  const virtualComponents = useMemo(() => {
    function Row({
      item,
      children,
      context,
      ...props
    }: ItemProps<T> & { context?: unknown }) {
      void context;
      const clickable = onRowClickRef.current;
      return (
        <tr
          {...props}
          className={cn(
            "border-t border-slate-100",
            clickable && "cursor-pointer hover:bg-blue-50/40",
          )}
          onClick={clickable ? () => clickable(item) : undefined}
        >
          {children}
        </tr>
      );
    }
    return {
      Table: ({
        children,
        style,
      }: {
        children?: ReactNode;
        style?: CSSProperties;
      }) => (
        <table className="w-full border-collapse text-sm" style={style}>
          {children}
        </table>
      ),
      TableRow: Row,
    };
  }, []);

  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return null;
    });
  };

  const toggleRow = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleAll = () => {
    const ids = displayRows.map(getRowId);
    const allSelected = ids.every((id) => selected.includes(id));
    setSelected((prev) =>
      allSelected
        ? prev.filter((id) => !ids.includes(id))
        : Array.from(new Set([...prev, ...ids])),
    );
  };

  const renderRowAction = (action: BDListAction<T>, row: T) =>
    action.iconOnly ? (
      <BDIconButton
        key={action.label}
        label={action.label}
        tooltip={action.tooltip}
        size="sm"
        variant={action.variant ?? "ghost"}
        icon={action.icon}
        disabled={action.isDisabled?.([row])}
        onClick={() => action.onSelect([row])}
      />
    ) : (
      <BDButton
        key={action.label}
        size="sm"
        variant={action.variant ?? "ghost"}
        icon={action.icon}
        disabled={action.isDisabled?.([row])}
        onClick={() => action.onSelect([row])}
      >
        {action.label}
      </BDButton>
    );

  const renderCells = (row: T) => {
    const id = getRowId(row);
    return (
      <>
        {hasBulk && (
          <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              aria-label="Select row"
              checked={selected.includes(id)}
              onChange={() => toggleRow(id)}
            />
          </td>
        )}
        {columns.map((col) => (
          <td
            key={col.key}
            className={cn(
              "px-3 py-2 text-slate-700",
              col.align === "center" && "text-center",
              col.align === "right" && "text-right",
              col.className,
            )}
          >
            {col.render
              ? col.render(row)
              : String((row as Record<string, unknown>)[col.key] ?? "")}
          </td>
        ))}
        {rowActions && rowActions.length > 0 && (
          <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-end gap-1">
              {rowActions.map((action) => renderRowAction(action, row))}
            </div>
          </td>
        )}
      </>
    );
  };

  const headerRow = (
    <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
      {hasBulk && (
        <th className="w-10 px-3 py-2">
          <input
            type="checkbox"
            aria-label="Select all"
            checked={
              displayRows.length > 0 &&
              displayRows.every((row) => selected.includes(getRowId(row)))
            }
            onChange={toggleAll}
          />
        </th>
      )}
      {columns.map((col) => (
        <th
          key={col.key}
          className={cn(
            "px-3 py-2 font-medium",
            col.align === "center" && "text-center",
            col.align === "right" && "text-right",
          )}
          style={{ width: col.width }}
        >
          {col.sortable ? (
            <button
              type="button"
              onClick={() => toggleSort(col.key)}
              className="inline-flex items-center gap-1 hover:text-slate-700"
            >
              {col.label}
              <ArrowUpDown className="h-3 w-3" />
            </button>
          ) : (
            col.label
          )}
        </th>
      ))}
      {rowActions && rowActions.length > 0 && (
        <th className="w-px px-3 py-2 text-right font-medium">Actions</th>
      )}
    </tr>
  );

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white",
        className,
      )}
    >
      {(title || toolbar || searchable || (hasBulk && selected.length > 0)) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-3">
            {title && (
              <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
            )}
            {hasBulk && selected.length > 0 && (
              <span className="text-xs text-slate-500">
                {selected.length} selected
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasBulk && selected.length > 0 && (
              <div className="flex items-center gap-1.5">
                {bulkActions?.map((action) =>
                  action.iconOnly ? (
                    <BDIconButton
                      key={action.label}
                      label={action.label}
                      tooltip={action.tooltip}
                      size="sm"
                      variant={action.variant ?? "secondary"}
                      icon={action.icon}
                      disabled={action.isDisabled?.(selectedRows)}
                      onClick={() => action.onSelect(selectedRows)}
                    />
                  ) : (
                    <BDButton
                      key={action.label}
                      size="sm"
                      variant={action.variant ?? "secondary"}
                      icon={action.icon}
                      disabled={action.isDisabled?.(selectedRows)}
                      onClick={() => action.onSelect(selectedRows)}
                    >
                      {action.label}
                    </BDButton>
                  ),
                )}
              </div>
            )}
            {searchable && (
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(0);
                  }}
                  placeholder={searchPlaceholder}
                  className="w-56 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm outline-none focus:border-blue-400"
                />
              </div>
            )}
            {toolbar}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-sm text-slate-500">
          Loading…
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-16 text-sm text-red-600">
          {error}
        </div>
      ) : displayRows.length === 0 ? (
        <div className="p-4">
          <BDEmptyState
            title={emptyState?.title ?? "Nothing here yet"}
            description={emptyState?.description}
            icon={emptyState?.icon}
            action={emptyState?.action}
          />
        </div>
      ) : virtual ? (
        <TableVirtuoso
          data={displayRows}
          style={{ height: virtual.height }}
          fixedHeaderContent={() => headerRow}
          itemContent={(_index, row) => renderCells(row)}
          computeItemKey={(_index, row) => getRowId(row)}
          components={virtualComponents}
        />
      ) : (
        <div className="bd-scroll overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>{headerRow}</thead>
            <tbody>
              {paged.map((row) => (
                <tr
                  key={getRowId(row)}
                  className={cn(
                    "border-t border-slate-100",
                    onRowClick && "cursor-pointer hover:bg-blue-50/40",
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {renderCells(row)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!virtual && !isLoading && !error && sorted.length > pageSize && (
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
          <span>
            {currentPage * pageSize + 1}–
            {Math.min((currentPage + 1) * pageSize, sorted.length)} of{" "}
            {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
              className="rounded p-1 disabled:opacity-40 hover:bg-slate-100"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>
              {currentPage + 1} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setPage(currentPage + 1)}
              className="rounded p-1 disabled:opacity-40 hover:bg-slate-100"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BDList;
