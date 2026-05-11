import { ReactNode } from "react";
import { UseAdminPanelProps } from "../../admin-panel.interface";

export interface AdminPanelProviderProps<
  TRow,
  TForm,
> extends UseAdminPanelProps<TRow, TForm> {
  children: ReactNode;
}
