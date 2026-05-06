import { useCallback, useState } from "react";
import {
  AdminPanelModalState,
  UseAdminPanelModal,
} from "./admin-panel-modal.interface";
import { AdminPanelFormMode } from "../form/admin-panel-form.interface";

export function useAdminPanelModal(
  initialMode: AdminPanelFormMode = "plain",
): UseAdminPanelModal {
  const [state, setState] = useState<AdminPanelModalState>({
    isOpen: false,
    mode: initialMode,
  });

  const openModal = useCallback((mode: AdminPanelFormMode) => {
    setState({
      isOpen: true,
      mode,
    });
  }, []);

  const closeModal = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  const openCreate = useCallback(() => openModal("create"), [openModal]);
  const openUpdate = useCallback(() => openModal("update"), [openModal]);
  const openView = useCallback(() => openModal("view"), [openModal]);
  const openPlain = useCallback(() => openModal("plain"), [openModal]);

  const resetModal = useCallback(() => {
    setState({
      isOpen: false,
      mode: initialMode,
    });
  }, [initialMode]);

  return {
    isOpen: state.isOpen,
    mode: state.mode,

    openModal,
    closeModal,

    openCreate,
    openUpdate,
    openView,
    openPlain,

    resetModal,
  };
}
