import { useCallback } from "react";
import { BunnyRowAction } from "../table/BunnyTable.Interface";
import { useAdminPanelContext } from "@/src/modules/admin-panel/features/provider";
import { BunnyHasId } from '../Bunny.Interface';

export function useBunnyRowActionCallback<TRow extends BunnyHasId>() {
  const { modal, del } = useAdminPanelContext();
  const callAction = useCallback(
    async (action: BunnyRowAction<TRow>, row: TRow) => {
      const { onClick } = action;
      const id = row.id;

      if (action.id === "view") {
        modal.openView(id);
        return;
      }
      if (action.id === "edit") {
        modal.openUpdate(id);
        return;
      }
      if (action.id === "delete") {
        del.openDeleteConfirm(row.id);
        return;
      }

      if (typeof onClick === "function") {
        const result = onClick(row);

        if (result instanceof Promise) {
          await result;
        }
      }
    },
    [del, modal],
  );
  return {
    callAction,
  };
}
