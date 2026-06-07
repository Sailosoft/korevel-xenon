import useAdminPanel from "../../admin-panel.hooks";
import { AdminPanelProviderProps } from "./admin-panel-provider.interface";
import { AdminPanelContext } from "./admin-panel-provider.context";
import { UseAdminPanel } from "../../admin-panel.interface";

export function AdminPanelProvider<TRow, TForm = unknown>({
  children,
  query,
  mutation,
  props,
}: AdminPanelProviderProps<TRow, TForm>) {
  const value = useAdminPanel<TRow, TForm>({
    query,
    mutation,
    props,
  });

  return (
    <AdminPanelContext.Provider value={value as UseAdminPanel<Record<string, unknown>, Record<string, unknown>>}>
      {children}
    </AdminPanelContext.Provider>
  );
}
