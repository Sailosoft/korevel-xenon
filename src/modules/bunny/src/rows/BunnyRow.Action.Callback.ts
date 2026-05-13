import { useCallback } from "react";
import { BunnyRowAction } from "../table/BunnyTable.Interface";
import { useAdminPanelContext } from "@/src/modules/admin-panel/features/provider";

export function useBunnyRowActionCallback<TRow>() {
  const { modal, del } = useAdminPanelContext();
  const callAction = useCallback(
    async (action: BunnyRowAction<TRow>, row: TRow) => {
      const { onClick } = action;
      const id = (row as any).id;

      if (action.id === "view") {
        modal.openView(id);
        return;
      }
      if (action.id === "edit") {
        modal.openUpdate(id);
        return;
      }
      if (action.id === "delete") {
        del.openDeleteConfirm((row as any).id);
        return;
      }

      if (typeof onClick === "function") {
        const result = onClick(row);

        if (result instanceof Promise) {
          await result;
        }
      }
    },
    [],
  );
  return {
    callAction,
  };
}
