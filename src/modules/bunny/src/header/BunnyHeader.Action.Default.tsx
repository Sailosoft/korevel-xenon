import { useMemo } from "react";
import {
  BunnyHeaderAction,
  BunnyHeaderActionType,
} from "./BunnyHeader.Interface";
import { DeleteIcon, PlusIcon, RefreshCwIcon, SearchIcon } from "lucide-react";
import { Input } from "@heroui/react";
import { useAdminPanelContext } from "@/src/modules/admin-panel/features/provider";

export function useBunnyHeaderActions(
  hides: BunnyHeaderActionType[],
): BunnyHeaderAction[] {
  // We stringify the array or use a stable key because arrays are reference types
  const hideKey = hides.join(",");

  return useMemo(() => {
    const actions: BunnyHeaderAction[] = [];

    if (!hides.includes("create")) {
      actions.push({
        id: "create",
        label: "Create",
        variant: "primary",
        icon: <PlusIcon />,
        onClick: () => {},
      });
    }

    if (!hides.includes("refresh")) {
      actions.push({
        id: "refresh",
        label: "Refresh",
        variant: "secondary",
        icon: <RefreshCwIcon />,
        onClick: () => {},
      });
    }

    if (!hides.includes("delete")) {
      actions.push({
        id: "delete",
        label: "Delete",
        variant: "danger",
        icon: <DeleteIcon />,
        onClick: () => {},
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
  }, [hideKey]);
}
