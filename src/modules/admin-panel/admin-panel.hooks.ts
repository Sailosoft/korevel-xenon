import { useMemo } from "react";
import { UseAdminPanel, UseAdminPanelProps } from "./admin-panel.interface";
import { useAdminPanelTable } from "./features/table/admin-panel-table.hooks";
import { useAdminPanelModal } from "./features/modal/admin-panel-modal.hooks";
import { useAdminPanelForm } from "./features/form/admin-panel-form.hooks";
import { useAdminPanelNotify } from "./features/notify/admin-panel-nofity.hooks";
import { useAdminPanelDelete } from "./features/del/admin-panel-del.hooks";
import { AdminPanelModalState } from "./features/modal/admin-panel-modal.interface";
import { useAdminPanelDialog } from "./features/dialog/admin-panel-dialog";

export default function useAdminPanel<TRow, TForm = unknown>({
  query,
  mutation,
  props,
}: UseAdminPanelProps<TRow, TForm>): UseAdminPanel<TRow, TForm> {
  const tableProps = props?.table;
  const table = useAdminPanelTable<TRow>({ query: query, ...tableProps });
  const modal = useAdminPanelModal();
  const notify = useAdminPanelNotify({ ...props?.notify });
  const del = useAdminPanelDelete<TRow, TForm>({
    notify,
    table,
    mutation,
  });

  const dialog = useAdminPanelDialog();

  const modalState = useMemo<AdminPanelModalState>(
    () => ({
      mode: modal.mode,
      id: modal.id,
      isOpen: modal.isOpen,
    }),
    [modal],
  );

  const form = useAdminPanelForm<TForm>({
    query,
    mutation,
    modal: modalState,
    ...props?.form,
    // onSuccess: async (data: TForm, mode?: AdminPanelFormMode) => {
    //   await table.fetchData();
    // },
    // onError: async (error: Error, mode?: AdminPanelFormMode) => {
    //   await table.fetchData();
    // },
  });

  const adminPanel = useMemo<UseAdminPanel<TRow, TForm>>(
    () => ({ table, modal, form, notify, del, dialog }),
    [table, modal, form, notify, del, dialog],
  );

  return adminPanel;
}
