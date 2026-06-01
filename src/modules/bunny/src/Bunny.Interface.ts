import { UseAdminPanel } from "../../admin-panel/admin-panel.interface";
import { UseAdminPanelFormPropsWithoutQueryMutation } from "../../admin-panel/features/form/admin-panel-form.interface";
import { AdminPanelId } from "../../admin-panel/features/id/admin-panel-id.interface";
import { AdminPanelMutation } from "../../admin-panel/features/mutation/admin-panel-mutation.interface";
import { UseAdminPanelNotifyProps } from "../../admin-panel/features/notify/admin-panel-notify.interface";
import { AdminPanelQuery } from "../../admin-panel/features/query/admin-panel-query.interface";
import { UseAdminPanelTablePropsWithoutQuery } from "../../admin-panel/features/table/admin-panel-table.interface";
import { BunnyFormConfig } from "./form/BunnyForm.Interface";
import {
  BunnyHeaderAction,
  BunnyHeaderActionType,
} from "./header/BunnyHeader.Interface";
import { BunnyModalHeaderAction } from "./modal/BunnyModal.Interface";
import { BunnyRowDefaultActions } from "./rows/BunnyRow.Interface";
import { BunnyColumn, BunnyRowAction } from "./table/BunnyTable.Interface";

export type BunnyCustomize<TRow, TForm> = (
  admin: UseAdminPanel<TRow, TForm>,
  config: BunnyConfig<TRow, TForm>,
) => Partial<BunnyConfig<TRow, TForm>>;

export interface BunnyProps<TRow, TForm> {
  children: React.ReactNode;
  config: BunnyConfig<TRow, TForm>;
}

export interface ExtendedBunnyProps<TRow, TForm> extends BunnyProps<
  TRow,
  TForm
> {
  customize?: BunnyCustomize<TRow, TForm>;
}

export interface BunnyConfig<TRow = unknown, TForm = unknown> {
  title: string;
  titlePlural?: string;
  modalSizeWidth?: number;
  modalSize?: "xs" | "sm" | "md" | "lg" | "cover" | "full";
  columns: BunnyColumn<TRow>[];
  rowKey: keyof TRow;
  tableHeight?: number | string;
  query: AdminPanelQuery<TRow, TForm>;
  mutation: AdminPanelMutation<TForm>;
  rowActionsColLength?: number;
  formConfig?: BunnyFormConfig<TForm>;

  /** Automatically pull in default platform header actions (create, refresh, etc.) */
  defaultHeaderActions?: boolean;
  /** Explicitly hide specific default header buttons */
  hideHeaderActions?: BunnyHeaderActionType[];
  /** Manually appended custom header items */
  headerActions?: BunnyHeaderAction<TRow, TForm>[];

  /** Automatically pull in default row actions (view, edit, delete) */
  defaultRowActions?: boolean;
  /** Explicitly hide specific default table row buttons */
  hideRowActions?: BunnyRowDefaultActions[];
  /** Manually appended custom row action items */
  rowActions?: BunnyRowAction<TRow>[];

  modalHeaderActions?: BunnyModalHeaderAction<TRow, TForm>[];

  props?: {
    table?: Partial<UseAdminPanelTablePropsWithoutQuery<TRow>>;
    form?: Partial<UseAdminPanelFormPropsWithoutQueryMutation<TForm>>;
    notify?: Partial<UseAdminPanelNotifyProps>;
  };
}

export interface BunnyHasId {
  id: AdminPanelId;
}

export interface BunnyKernel<TRow, TForm> {
  config: BunnyConfig<TRow, TForm>;
  adminPanel: UseAdminPanel<TRow, TForm>;
}
