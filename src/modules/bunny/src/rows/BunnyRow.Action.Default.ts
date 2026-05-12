import React, { useMemo } from "react";
import { BunnyRowAction } from "../table/BunnyTable.Interface";
import { PencilIcon, Trash2Icon, ViewIcon } from "lucide-react";
import { useAdminPanelContext } from "@/src/modules/admin-panel/features/provider";

export function useBunnyRowActionDefault<TRow>({
  hides,
}: {
  hides: Array<"view" | "edit" | "delete">;
}) {
  const { modal, table } = useAdminPanelContext();
  return useMemo<BunnyRowAction<TRow>[]>(() => {
    const actions: BunnyRowAction<TRow>[] = [];

    if (!hides.includes("view")) {
      actions.push({
        id: "view",
        // label: "View",
        variant: "ghost",
        icon: React.createElement(ViewIcon),
        onClick: () => {},
      });
    }

    if (!hides.includes("edit")) {
      actions.push({
        id: "edit",
        // label: "Edit",
        icon: React.createElement(PencilIcon),
        variant: "secondary",
        onClick: () => {},
      });
    }

    if (!hides.includes("delete")) {
      actions.push({
        id: "delete",
        // label: "Delete",
        variant: "danger-soft",
        icon: React.createElement(Trash2Icon),
        onClick: () => {},
      });
    }

    return actions;
  }, []);
}
