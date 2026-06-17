import { ReactNode } from "react";
import { BunnyKernel } from "../Bunny.Interface";

export type BunnyHeaderActionType =
  | "create"
  | "refresh"
  | "delete"
  | "search"
  | "export"
  | "import";
export type BunnyHeaderVariants =
  | "primary"
  | "secondary"
  | "accent"
  | "ghost"
  | "danger"
  | "danger-soft"
  | "tertiary"
  | "outline";

export type BunnyHeaderVariant = "default" | "detailed";

export interface BunnyHeaderConfig {
  /** Optional icon component displayed in the header (used with "detailed" variant) */
  icon?: ReactNode;
  /** Optional description text displayed below the title (used with "detailed" variant) */
  description?: string;
  /**
   * Header layout variant:
   * - `"default"`: Simple title + actions row (current behavior)
   * - `"detailed"`: Icon badge + title + description + actions layout
   */
  variant?: BunnyHeaderVariant;
}

export interface BunnyHeaderAction<TRow = unknown, TForm = unknown> {
  id?: string;
  label: string;
  icon?: ReactNode;
  variant?: BunnyHeaderVariants;
  onClick?: (context?: BunnyKernel<TRow, TForm>) => void;
  disable?: boolean;
  render?: (context?: BunnyKernel<TRow, TForm>) => React.ReactNode;
  displayMode?: "always" | "collapse";
}

export interface BunnyHeaderDefaultActions {
  create: BunnyHeaderAction;
  refresh: BunnyHeaderAction;
  delete: BunnyHeaderAction;
  search: BunnyHeaderAction;
}
