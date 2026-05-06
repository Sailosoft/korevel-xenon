import { AdminPanelMutation } from "../mutation/admin-panel-mutation.interface";
import { UseAdminPanelTable } from "../table/admin-panel-table.interface";
import { UseAdminPanelModal } from "../modal/admin-panel-modal.interface";
import { AdminPanelNotify } from "../notify/admin-panel-notify.interface";

export interface UseAdminPanelDeleteProps<T = any> {
  mutation: AdminPanelMutation<T>["delete"]; // or AdminPanelDeleteMutation<T>
  table: UseAdminPanelTable<T>;
  modal: UseAdminPanelModal;
  notify?: AdminPanelNotify;
  successMessage?: string;
  confirmMessage?: (item: T) => string;
  itemName?: string;
}

export interface UseAdminPanelDeleteReturn<T = any> {
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
