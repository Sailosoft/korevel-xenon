import { UseAdminPanel } from "../../admin-panel/admin-panel.interface";
import { UseAdminPanelFormPropsWithoutQueryMutation } from "../../admin-panel/features/form/admin-panel-form.interface";
import { AdminPanelMutation } from "../../admin-panel/features/mutation/admin-panel-mutation.interface";
import { UseAdminPanelNotifyProps } from "../../admin-panel/features/notify/admin-panel-notify.interface";
import { AdminPanelQuery } from "../../admin-panel/features/query/admin-panel-query.interface";
import { UseAdminPanelTablePropsWithoutQuery } from "../../admin-panel/features/table/admin-panel-table.interface";
import { BunnyHeaderAction } from "./header/BunnyHeader.Interface";
import { BunnyColumn, BunnyRowAction } from "./table/BunnyTable.Interface";

export type BunnyAdjust<TRow, TForm> = (
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
  adjust?: BunnyAdjust<TRow, TForm>;
}

export interface BunnyConfig<TRow = any, TForm = any> {
  title: string;
  titlePlural?: string;
  modalSizeWidth?: number;
  modalSize?: "xs" | "sm" | "md" | "lg" | "cover" | "full";
  columns: BunnyColumn<TRow>[];
  rowActions?: BunnyRowAction<TRow>[];
  rowKey: keyof TRow;
  headerActions?: BunnyHeaderAction[];
  tableHeight?: number | string;
  query: AdminPanelQuery<TRow, TForm>;
  mutation: AdminPanelMutation<TForm>;
  rowActionsColLength?: number;

  props?: {
    table?: Partial<UseAdminPanelTablePropsWithoutQuery<TRow>>;
    form?: Partial<UseAdminPanelFormPropsWithoutQueryMutation<TForm>>;
    notify?: Partial<UseAdminPanelNotifyProps>;
  };
}
