import { useCallback } from "react";
import { BunnyRowAction } from "../table/BunnyTable.Interface";
import { useAdminPanelContext } from "@/src/modules/admin-panel/features/provider";
import { BunnyHasId } from "../Bunny.Interface";
import { useBunnyKernel } from "../kernel";

export function useBunnyRowActionCallback<TRow extends BunnyHasId>() {
  const { modal, del } = useAdminPanelContext();
  const kernel = useBunnyKernel<TRow, unknown>();
  const callAction = useCallback(
    async (action: BunnyRowAction<TRow>, row: TRow) => {
      const { onClick } = action;

      if (typeof onClick === "function") {
        const result = onClick(row, kernel);

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
