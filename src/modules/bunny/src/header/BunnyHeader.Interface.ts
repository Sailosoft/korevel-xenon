import { ReactNode } from "react";

export type BunnyHeaderActionType = "create" | "refresh" | "delete" | "search";
export type BunnyHeaderVariants =
  | "primary"
  | "secondary"
  | "accent"
  | "ghost"
  | "danger"
  | "danger-soft"
  | "tertiary"
  | "outline";
export interface BunnyHeaderAction {
  id?: string;
  label: string;
  icon?: ReactNode;
  variant?: BunnyHeaderVariants;
  onClick?: () => void;
  disable?: boolean;
  render?: () => React.ReactNode;
}

export interface BunnyHeaderDefaultActions {
  create: BunnyHeaderAction;
  refresh: BunnyHeaderAction;
  delete: BunnyHeaderAction;
  search: BunnyHeaderAction;
}
