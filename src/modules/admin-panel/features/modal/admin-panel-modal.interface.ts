import { AdminPanelFormMode } from "../form/admin-panel-form.interface";

export interface AdminPanelModalState {
  isOpen: boolean;
  mode: AdminPanelFormMode;
}

export interface UseAdminPanelModal {
  // State
  isOpen: boolean;
  mode: AdminPanelFormMode;

  // Core Actions
  openModal: (mode: AdminPanelFormMode) => void;
  closeModal: () => void;

  // Convenience Methods (for table actions)
  openCreate: () => void;
  openUpdate: () => void;
  openView: () => void;
  openPlain: () => void;

  // Reset
  resetModal: () => void;
}
