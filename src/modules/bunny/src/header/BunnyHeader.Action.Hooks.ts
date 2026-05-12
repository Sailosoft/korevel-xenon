import { useMemo } from "react";
import { useBunnyConfig } from "../context/BunnyContext";
import { useAdminPanelContext } from "@/src/modules/admin-panel/features/provider";

export const useBunnyHeaderMappedHeaderActions = () => {
  const { headerActions } = useBunnyConfig();
  const { modal } = useAdminPanelContext();
  const { openCreate, openUpdate, openView, openPlain, closeModal } = modal;
  const mapped = useMemo(() => {
    return headerActions?.map((action) => {
      switch (action.id) {
        case "create":
          return {
            ...action,
            onClick: openCreate,
          };
        case "update":
          return {
            ...action,
            onClick: openUpdate,
          };
        case "view":
          return {
            ...action,
            onClick: openView,
          };
        case "plain":
          return {
            ...action,
            onClick: openPlain,
          };
        case "delete":
          return {
            ...action,
            onClick: closeModal,
          };
        default:
          return action;
      }
    });
  }, [headerActions, openCreate, openUpdate, openView, openPlain, closeModal]);
  return mapped;
};
