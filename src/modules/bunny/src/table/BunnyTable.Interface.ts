import { ReactNode } from "react";

export interface BunnyColumn<TRow = any> {
  field: string;
  header: string;
  sortable?: boolean;
  width?: number | string;
  isRowHeader?: boolean;
  render?: (row: TRow, column: BunnyColumn<TRow>) => ReactNode;
}
export interface BunnyRowAction<TRow = any> {
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
  onClick: (row: TRow) => void;
}

export interface BunnyPagination {}
