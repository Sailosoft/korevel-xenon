import React, { useMemo } from "react";
import {
  BunnyHeaderAction,
  BunnyHeaderActionType,
} from "./BunnyHeader.Interface";
import { DeleteIcon, FileJsonIcon, LucideUpload, PlusIcon, RefreshCwIcon } from "lucide-react";

export function useBunnyHeaderActions(
  hides: BunnyHeaderActionType[],
): BunnyHeaderAction[] {
  return useMemo(() => {
    const actions: BunnyHeaderAction[] = [];

    if (!hides.includes("create")) {
      actions.push({
        id: "create",
        label: "Create",
        variant: "primary",
        icon: React.createElement(PlusIcon),
        onClick: () => {},
      });
    }

    if (!hides.includes("refresh")) {
      actions.push({
        id: "refresh",
        label: "Refresh",
        variant: "secondary",
        icon: React.createElement(RefreshCwIcon),
        onClick: () => {},
      });
    }

    if (!hides.includes("delete")) {
      actions.push({
        id: "delete",
        label: "Delete",
        variant: "danger",
        icon: React.createElement(DeleteIcon),
        onClick: () => {},
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
