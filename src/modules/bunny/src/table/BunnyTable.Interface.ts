import { ReactNode } from "react";
import { BunnyKernel } from "../Bunny.Interface";

export type BunnyTableMode = "desktop" | "mobile";
export type BunnyTableMobileView<TRow> = (
  row: TRow,
  columns: BunnyColumn<TRow>[],
) => ReactNode;
/**
 * Maps a row's foreign-key style field to a related record and displays a
 * property from that record.
 *
 * @example
 * // Row: { patternId: "uuid-123", ... } and records: BKThoughtPattern[]
 * {
 *   field: "patternId",
 *   header: "Pattern",
 *   mapping: {
 *     getRecords: () => bkThinkerDB.thoughtPatterns.toArray(),
 *     key: "id",
 *     label: "name",
 *   },
 * }
 */
export interface BunnyColumnMapping<
  TRow = unknown,
  TRecord = Record<string, unknown>,
> {
  /** Fetches the related records used to resolve the mapping. */
  getRecords: () => TRecord[] | Promise<TRecord[]>;
  /** Field on the related record that matches this column's value. Defaults to `"id"`. */
  key?: string;
  /** Property (or dot path) on the matched record to display, e.g. `"name"`. */
  label?: string;
  /** Optional custom renderer for the matched record. */
  render?: (
    record: TRecord | undefined,
    row: TRow,
    column: BunnyColumn<TRow>,
  ) => ReactNode;
  /** Fallback text shown when no related record matches. Defaults to the raw value. */
  fallback?: string;
}

export interface BunnyColumn<TRow = unknown> {
  field: string;
  header: string;
  sortable?: boolean;
  width?: number | string;
  isRowHeader?: boolean;
  render?: (row: TRow, column: BunnyColumn<TRow>) => ReactNode;
  format?: (value: any, row: TRow, column: BunnyColumn<TRow>) => any;
  /** Optional data-record mapping: resolve this column's value against a related record set. */
  mapping?: BunnyColumnMapping<TRow>;
}

export interface BunnyRowAction<TRow = unknown> {
  id: string;
  label?: string;
  icon?: ReactNode; // Using Iconify string for simplicity
  variant?:
    | "primary"
    | "secondary"
    | "danger"
    | "ghost"
    | "outline"
    | "tertiary"
    | "danger-soft";
  onClick: (
    row: TRow,
    context: BunnyKernel<TRow, unknown>,
  ) => void | Promise<void>;
}
