import { useMemo } from "react";
import { useBunnyConfig } from "../context/BunnyContext";
import { useAdminPanelContext } from "@/src/modules/admin-panel/features/provider";

export const useBunnyHeaderMappedHeaderActions = () => {
  const { headerActions } = useBunnyConfig();
  const { modal, table } = useAdminPanelContext();
  const { openCreate, closeModal } = modal;
  const { fetchData } = table;
  const mapped = useMemo(() => {
    return headerActions?.map((action) => {
      switch (action.id) {
        case "create":
          return {
            ...action,
            onClick: openCreate,
          };
        case "refresh":
          return {
            ...action,
            onClick: async () => {
              await fetchData();
            },
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
  }, [headerActions, openCreate, closeModal]);
  return mapped;
};
