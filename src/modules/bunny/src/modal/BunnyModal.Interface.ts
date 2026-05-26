import { BunnyKernel } from "../Bunny.Interface";
import { AdminPanelFormMode } from "@/src/modules/admin-panel/features/form/admin-panel-form.interface";

export interface BunnyModalHeaderAction<TRow, TForm> {
  id: string;
  icon?: React.ReactNode;
  label?: string;
  onClick: (context?: BunnyKernel<TRow, TForm>) => void; // Passing context gives action buttons instant engine control
  variant?: "default" | "primary" | "secondary" | "danger" | "danger-soft";
  hide?: AdminPanelFormMode[] | ((context?: BunnyKernel<TRow, TForm>) => boolean);
  render?: () => React.ReactNode;
}