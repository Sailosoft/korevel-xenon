import { ReactNode } from "react";
import { BunnyKernel } from "../Bunny.Interface";

export type BunnyTableMode = "desktop" | "mobile";
export type BunnyTableMobileView<TRow> = (
  row: TRow,
  columns: BunnyColumn<TRow>[],
) => ReactNode;
export interface BunnyColumn<TRow = unknown> {
  field: string;
  header: string;
  sortable?: boolean;
  width?: number | string;
  isRowHeader?: boolean;
  render?: (row: TRow, column: BunnyColumn<TRow>) => ReactNode;
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
