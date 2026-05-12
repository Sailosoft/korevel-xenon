import { useMemo } from "react";
import { UseAdminPanel, UseAdminPanelProps } from "./admin-panel.interface";
import { useAdminPanelTable } from "./features/table/admin-panel-table.hooks";
import { useAdminPanelModal } from "./features/modal/admin-panel-modal.hooks";
import { useAdminPanelForm } from "./features/form/admin-panel-form.hooks";
import { useAdminPanelNotify } from "./features/notify/admin-panel-nofity.hooks";
import { useAdminPanelDelete } from "./features/del/admin-panel-del.hooks";
import { AdminPanelFormMode } from "./features/form/admin-panel-form.interface";

export default function useAdminPanel<TRow, TForm = any>({
  query,
  mutation,
  props,
}: UseAdminPanelProps<TRow, TForm>): UseAdminPanel<TRow, TForm> {
  const tableProps = props?.table;
  const table = useAdminPanelTable<TRow>({ query: query, ...tableProps });
  const modal = useAdminPanelModal();
  const notify = useAdminPanelNotify({ ...props?.notify });
  const del = useAdminPanelDelete<TRow>({ notify, table, mutation, modal });

  const mode = useMemo(() => {
    return modal.mode;
  }, [modal.mode]);

  const form = useAdminPanelForm<TForm>({
    query,
    mutation,
    mode,
    ...props?.form,
    // onSuccess: async (data: TForm, mode?: AdminPanelFormMode) => {
    //   await table.fetchData();
    // },
    // onError: async (error: Error, mode?: AdminPanelFormMode) => {
    //   await table.fetchData();
    // },
  });

  const adminPanel = useMemo<UseAdminPanel<TRow, TForm>>(
    () => ({ table, modal, form, notify, del }),
    [table, modal, form, notify, del],
  );

  return adminPanel;
}
