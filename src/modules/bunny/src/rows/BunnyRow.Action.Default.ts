import React, { useMemo } from "react";
import { BunnyRowAction } from "../table/BunnyTable.Interface";
import { PencilIcon, Trash2Icon, ViewIcon } from "lucide-react";
import { BunnyRowDefaultActions } from "./BunnyRow.Interface";
import { BunnyHasId } from "../Bunny.Interface";

export const getBunnyDefaultRowActions = <TRow>(): Record<
  BunnyRowDefaultActions,
  BunnyRowAction<TRow>
> => ({
  view: {
    id: "view",
    variant: "ghost",
    icon: React.createElement(ViewIcon),
    onClick: (row, { adminPanel }) => {
      // row is inferred as TRow, which safely includes .id via the constraint
      adminPanel.modal.openView((row as BunnyHasId).id);
    },
  },
  edit: {
    id: "edit",
    icon: React.createElement(PencilIcon),
    variant: "secondary",
    onClick: (row, { adminPanel }) => {
      adminPanel.modal.openUpdate((row as BunnyHasId).id);
    },
  },
  delete: {
    id: "delete",
    variant: "danger-soft",
    icon: React.createElement(Trash2Icon),
    onClick: (row, { adminPanel }) => {
      adminPanel.del.openDeleteConfirm((row as BunnyHasId).id);
    },
  },
});
export function useBunnyRowActionDefault<TRow>({
  hides,
}: {
  hides: Array<BunnyRowDefaultActions>;
}) {
  return useMemo<BunnyRowAction<TRow>[]>(() => {
    const bunnyDefaultRowAction = getBunnyDefaultRowActions<TRow>();
    const actions = Object.keys(bunnyDefaultRowAction)
      .filter((key) => !hides.includes(key as BunnyRowDefaultActions))
      .map((key) => bunnyDefaultRowAction[key as BunnyRowDefaultActions]);

      return actions as unknown as BunnyRowAction<TRow>[];
  }, [hides]);
}