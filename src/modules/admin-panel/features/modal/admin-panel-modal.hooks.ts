import { useCallback, useState } from "react";
import {
  AdminPanelModalState,
  UseAdminPanelModal,
} from "./admin-panel-modal.interface";
import { AdminPanelFormMode } from "../form/admin-panel-form.interface";
import { AdminPanelId } from "../id/admin-panel-id.interface";

export function useAdminPanelModal(
  initialMode: AdminPanelFormMode = "plain",
): UseAdminPanelModal {
  const [state, setState] = useState<AdminPanelModalState>({
    isOpen: false,
    mode: initialMode,
    id: null,
  });

  const setIsOpen = useCallback((isOpen: boolean) => {
    setState((prev) => ({
      ...prev,
      isOpen,
    }));
  }, []);

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
  const openUpdate = useCallback(
    (id: AdminPanelId) =>
      setState({
        isOpen: true,
        mode: "update",
        id,
      }),
    [openModal],
  );
  const openView = useCallback(
    (id: AdminPanelId) =>
      setState({
        isOpen: true,
        mode: "view",
        id,
      }),
    [openModal],
  );
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
    setIsOpen,
    openCreate,
    openUpdate,
    openView,
    openPlain,

    resetModal,
  };
}
