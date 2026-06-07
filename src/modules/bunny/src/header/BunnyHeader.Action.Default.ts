import React, { useMemo } from "react";
import {
  BunnyHeaderAction,
  BunnyHeaderActionType,
} from "./BunnyHeader.Interface";
import {
  DeleteIcon,
  FileJsonIcon,
  LucideUpload,
  PlusIcon,
  RefreshCwIcon,
} from "lucide-react";

export function useBunnyHeaderActions<TRow, TForm>(
  hides: BunnyHeaderActionType[],
): BunnyHeaderAction<TRow, TForm>[] {
  return useMemo(() => {
    const actions: BunnyHeaderAction<TRow, TForm>[] = [];

    if (!hides.includes("create")) {
      actions.push({
        id: "create",
        label: "Create",
        variant: "primary",
        icon: React.createElement(PlusIcon),
        onClick: (context) => {
          context?.adminPanel.modal.openCreate();
        },
      });
    }

    if (!hides.includes("refresh")) {
      actions.push({
        id: "refresh",
        label: "Refresh",
        variant: "secondary",
        icon: React.createElement(RefreshCwIcon),
        onClick: async (context) => {
          await context?.adminPanel.table.fetchData();
        },
      });
    }

    if (!hides.includes("delete")) {
      actions.push({
        id: "delete",
        label: "Delete",
        variant: "danger",
        icon: React.createElement(DeleteIcon),
        onClick: (context) => {
          context?.adminPanel.del.openBatchDeleteConfirm();
        },
      });
    }

    if (!hides.includes("export")) {
      actions.push({
        id: "export",
        label: "Export Records",
        variant: "secondary",
        icon: React.createElement(FileJsonIcon),
        onClick: () => {},
        displayMode: "collapse",
      });
    }

    if (!hides.includes("import")) {
      actions.push({
        id: "import",
        label: "Import Records",
        variant: "secondary",
        icon: React.createElement(LucideUpload),
        onClick: () => {},
        displayMode: "collapse",
      });
    }

    // if (!hides.includes("search")) {
    //   actions.push({
    //     id: "search",
    //     label: "Search",
    //     render() {
    //       return <Input />;
    //     },
    //   });
    // }

    return actions;
    // Dependency on hideKey ensures it only re-runs when the items in the array change
  }, [hides]);
}
