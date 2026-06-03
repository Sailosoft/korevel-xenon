import React, { useMemo } from "react";
import { BunnyRowAction } from "../table/BunnyTable.Interface";
import { PencilIcon, Trash2Icon, ViewIcon } from "lucide-react";
import { BunnyRowDefaultActions } from "./BunnyRow.Interface";
import { BunnyHasId } from "../Bunny.Interface";

export function useBunnyRowActionDefault<TRow>({
  hides,
}: {
  hides: Array<BunnyRowDefaultActions>;
}) {
  return useMemo<BunnyRowAction<TRow>[]>(() => {
    const actions: BunnyRowAction<TRow>[] = [];

    if (!hides.includes("view")) {
      actions.push({
        id: "view",
        variant: "ghost",
        icon: React.createElement(ViewIcon),
        onClick: (row, { adminPanel: { modal } }) => {
          const rowData = row as BunnyHasId;
          modal.openView(rowData.id);
        },
      });
    }

    if (!hides.includes("edit")) {
      actions.push({
        id: "edit",
        icon: React.createElement(PencilIcon),
        variant: "secondary",
        onClick: (row, { adminPanel: { modal } }) => {
          const rowData = row as BunnyHasId;
          modal.openUpdate(rowData.id);
        },
      });
    }

    if (!hides.includes("delete")) {
      actions.push({
        id: "delete",
        variant: "danger-soft",
        icon: React.createElement(Trash2Icon),
        onClick: (row, { adminPanel: { del } }) => {
          const rowData = row as BunnyHasId;
          del.openDeleteConfirm(rowData.id);
        },
      });
    }

    return actions;
  }, [hides]);
}
