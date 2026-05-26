import { ReactNode } from "react";
import { BunnyKernel } from "../Bunny.Interface";

export type BunnyHeaderActionType = "create" | "refresh" | "delete" | "search" | "export" | "import";
export type BunnyHeaderVariants =
  | "primary"
  | "secondary"
  | "accent"
  | "ghost"
  | "danger"
  | "danger-soft"
  | "tertiary"
  | "outline";

export interface BunnyHeaderAction<TRow = unknown, TForm = unknown> {
  id?: string;
  label: string;
  icon?: ReactNode;
  variant?: BunnyHeaderVariants;
  onClick?: (context?: BunnyKernel<TRow, TForm>) => void;
  disable?: boolean;
  render?: () => React.ReactNode;
  displayMode?: "always" | "collapse";
}

export interface BunnyHeaderDefaultActions {
  create: BunnyHeaderAction;
  refresh: BunnyHeaderAction;
  delete: BunnyHeaderAction;
  search: BunnyHeaderAction;
}
