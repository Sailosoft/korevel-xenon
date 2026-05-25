import { AdminPanelMutation } from "../mutation/admin-panel-mutation.interface";
import { UseAdminPanelTable } from "../table/admin-panel-table.interface";
import { UseAdminPanelNotify } from "../notify/admin-panel-notify.interface";
import { AdminPanelId } from '../id/admin-panel-id.interface';

export type AdminPanelDeleteMode = "single" | "batch";

export interface UseAdminPanelDeleteProps<TRow, TForm> {
  mutation: AdminPanelMutation<TForm>; // or AdminPanelDeleteMutation<T>
  table: UseAdminPanelTable<TRow>;
  notify?: UseAdminPanelNotify;
  successMessage?: string;
  confirmMessage?: (item: TRow) => string;
  itemName?: string;
}

export interface UseAdminPanelDelete<T> {
  open: boolean;
  isDeleting: boolean;
  error: Error | null;
  mode: AdminPanelDeleteMode;
  confirmMessage: (item: T) => string;

  setOpen: (open: boolean) => void;
  setMode: (mode: AdminPanelDeleteMode) => void;
  // Main action
  deleteItem: () => Promise<void>;

  // Modal helpers
  openDeleteConfirm: (id: AdminPanelId) => void;
  openBatchDeleteConfirm: () => void; // New helper
  closeDeleteModal: () => void;
  deleteBatch: () => Promise<void>;

  // Direct delete (headless)
  deleteWithoutConfirm: (id: AdminPanelId) => Promise<void>;
}
