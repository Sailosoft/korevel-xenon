import useAdminPanel from "../../admin-panel.hooks";
import { AdminPanelProviderProps } from "./admin-panel-provider.interface";
import { AdminPanelContext } from "./admin-panel-provider.context";

export function AdminPanelProvider<TRow, TForm = any>({
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
    <AdminPanelContext.Provider value={value}>
      {children}
    </AdminPanelContext.Provider>
  );
}
