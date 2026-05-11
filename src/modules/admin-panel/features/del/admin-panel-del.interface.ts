import { AdminPanelMutation } from "../mutation/admin-panel-mutation.interface";
import { UseAdminPanelTable } from "../table/admin-panel-table.interface";
import { UseAdminPanelModal } from "../modal/admin-panel-modal.interface";
import { UseAdminPanelNotify } from "../notify/admin-panel-notify.interface";

export interface UseAdminPanelDeleteProps<TRow = any, TForm = any> {
  mutation: AdminPanelMutation<TForm>; // or AdminPanelDeleteMutation<T>
  table: UseAdminPanelTable<TRow>;
  modal: UseAdminPanelModal;
  notify?: UseAdminPanelNotify;
  successMessage?: string;
  confirmMessage?: (item: TRow) => string;
  itemName?: string;
}

export interface UseAdminPanelDelete<T = any> {
  isDeleting: boolean;
  error: Error | null;
  confirmMessage: (item: T) => string;

  // Main action
  deleteItem: (id: string | number) => Promise<void>;

  // Modal helpers
  openDeleteConfirm: (id: string | number) => void;
  closeDeleteModal: () => void;

  // Direct delete (headless)
  deleteWithoutConfirm: (id: string | number) => Promise<void>;
}
