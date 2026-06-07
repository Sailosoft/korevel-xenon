import { createContext, useContext } from "react";
import { UseAdminPanel } from "../../admin-panel.interface";

export const AdminPanelContext = createContext<
  UseAdminPanel<Record<string, unknown>, Record<string, unknown>> | undefined
>(undefined);

export function useAdminPanelContext<TRow, TForm>() {
  const context = useContext(AdminPanelContext);

  if (!context) {
    throw new Error(
      "useAdminPanelContext must be used within an AdminPanelProvider",
    );
  }

  return context as UseAdminPanel<TRow, TForm>;
}
