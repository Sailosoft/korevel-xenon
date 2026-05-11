import { UseAdminPanelDelete } from "./features/del/admin-panel-del.interface";
import {
  UseAdminPanelForm,
  UseAdminPanelFormPropsWithoutQueryMutation,
} from "./features/form/admin-panel-form.interface";
import { UseAdminPanelModal } from "./features/modal/admin-panel-modal.interface";
import { AdminPanelMutation } from "./features/mutation/admin-panel-mutation.interface";
import {
  UseAdminPanelNotify,
  UseAdminPanelNotifyProps,
} from "./features/notify/admin-panel-notify.interface";
import { AdminPanelQuery } from "./features/query/admin-panel-query.interface";
import {
  UseAdminPanelTable,
  UseAdminPanelTablePropsWithoutQuery,
} from "./features/table/admin-panel-table.interface";

export interface UseAdminPanel<TRow, TForm> {
  form: UseAdminPanelForm<TForm>;
  table: UseAdminPanelTable<TRow>;
  modal: UseAdminPanelModal;
  notify: UseAdminPanelNotify;
  del: UseAdminPanelDelete<TRow>;
}

export interface UseAdminPanelProps<TRow, TForm> {
  query: AdminPanelQuery<TRow, TForm>;
  mutation: AdminPanelMutation<TForm>;
  props?: {
    table?: Partial<UseAdminPanelTablePropsWithoutQuery<TRow>>;
    form?: Partial<UseAdminPanelFormPropsWithoutQueryMutation<TForm>>;
    notify?: Partial<UseAdminPanelNotifyProps>;
  };
}
