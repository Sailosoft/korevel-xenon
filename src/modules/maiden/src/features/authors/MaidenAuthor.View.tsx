"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import { maidenAuthorModule } from "./MaidenAuthor.Module";
import { useCallback, useMemo } from "react";
import {
  BunnyAdjust,
  BunnyConfig,
} from "@/src/modules/bunny/src/Bunny.Interface";
import { MaidenAuthor } from "../../entities/entities";
import { useBunnyHeaderActions } from "@/src/modules/bunny/src/header/BunnyHeader.Action.Default";
import MaidenAuthorForm from "./MaidenAuthor.Form";
import { useBunnyRowActionDefault } from "@/src/modules/bunny/src/rows/BunnyRow.Action.Default";
import { Edit } from "lucide-react";

export default function MaidenAuthorView() {
  const actions = useBunnyHeaderActions([]);
  const row = useBunnyRowActionDefault({ hides: [] });
  // maidenAuthorModule.config.headerActions = cr
  const module = useMemo<BunnyConfig<MaidenAuthor, MaidenAuthor>>(() => {
    return {
      ...maidenAuthorModule.config,
      headerActions: actions,
      rowActions: row,
    };
  }, []);

  const adjust: BunnyAdjust<MaidenAuthor, MaidenAuthor> = useCallback(
    (admin, config) => {
      admin.table = { ...admin.table, selectionMode: "single" };
      // admin.
      return {
        rowActions: [
          ...config.rowActions!,
          {
            id: "edit2",
            icon: <Edit />,
            // label: "Edit",
            onClick: (item) => {},
          },
        ],
      };
    },
    [],
  );

  return (
    <div className="px-6">
      <Bunny config={module} adjust={adjust}>
        <MaidenAuthorForm />
      </Bunny>
    </div>
  );
}
