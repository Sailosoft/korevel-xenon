import { AdminPanelFormMode } from "../form/admin-panel-form.interface";
import { AdminPanelId } from "../id/admin-panel-id.interface";

export interface AdminPanelModalState {
  isOpen: boolean;
  mode: AdminPanelFormMode;
  id?: AdminPanelId;
}

export interface UseAdminPanelModal extends AdminPanelModalState {
  isLoading: boolean;
  setIsLoadingOn: () => void;
  setIsLoadingOff: () => void;
  // Core Actions
  openModal: (mode: AdminPanelFormMode) => void;
  closeModal: () => void;
  setIsOpen: (isOpen: boolean) => void;

  // Convenience Methods (for table actions)
  openCreate: () => void;
  openUpdate: (id: AdminPanelId) => void;
  openView: (id: AdminPanelId) => void;
  openPlain: () => void;

  // Reset
  resetModal: () => void;
}
