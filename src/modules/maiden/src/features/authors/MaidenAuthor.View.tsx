"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import { maidenAuthorModule } from "./MaidenAuthor.Module";
import { useMemo } from "react";
import { BunnyConfig } from "@/src/modules/bunny/src/Bunny.Interface";
import { MaidenAuthor } from "../../entities/entities";
import { useBunnyHeaderActions } from "@/src/modules/bunny/src/header/BunnyHeader.Action.Default";
import MaidenAuthorForm from "./MaidenAuthor.Form";
import { useBunnyRowActionDefault } from "@/src/modules/bunny/src/rows/BunnyRow.Action.Default";

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
  return (
    <div className="px-6">
      <Bunny config={module}>
        <MaidenAuthorForm />
      </Bunny>
    </div>
  );
}
