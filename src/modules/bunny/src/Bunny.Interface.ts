import { UseAdminPanelFormPropsWithoutQueryMutation } from "../../admin-panel/features/form/admin-panel-form.interface";
import { AdminPanelMutation } from "../../admin-panel/features/mutation/admin-panel-mutation.interface";
import { UseAdminPanelNotifyProps } from "../../admin-panel/features/notify/admin-panel-notify.interface";
import { AdminPanelQuery } from "../../admin-panel/features/query/admin-panel-query.interface";
import { UseAdminPanelTablePropsWithoutQuery } from "../../admin-panel/features/table/admin-panel-table.interface";
import { BunnyHeaderAction } from "./header/BunnyHeader.Interface";
import { BunnyColumn, BunnyRowAction } from "./table/BunnyTable.Interface";

export interface BunnyProps<TRow, TForm> {
  children: React.ReactNode;
  config: BunnyConfig<TRow, TForm>;
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

  query: AdminPanelQuery<TRow, TForm>;
  mutation: AdminPanelMutation<TForm>;

  props?: {
    table?: Partial<UseAdminPanelTablePropsWithoutQuery<TRow>>;
    form?: Partial<UseAdminPanelFormPropsWithoutQueryMutation<TForm>>;
    notify?: Partial<UseAdminPanelNotifyProps>;
  };
}
