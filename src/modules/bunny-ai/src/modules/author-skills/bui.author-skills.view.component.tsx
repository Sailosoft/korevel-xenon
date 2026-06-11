"use client";

import React, { useCallback } from "react";
import { useAdminPanelContext } from "@/src/modules/admin-panel/features/provider";
import BUIAuthorSkillAttach, {
  BUISkillSelectorDialogContent,
} from "./bui.author-skills.attach.component";
import BUIAuthorSkillRelationRepository from "./bui.author-skills.relation.repository";
import { buiDatabase } from "../../database/bui.database";

export default function BUIAuthorViewSkills() {
  const admin = useAdminPanelContext();
  const { modal } = admin;
  const { mode, id } = modal;

  const relationRepo = new BUIAuthorSkillRelationRepository();
  // Store refresh callback so we can call it after dialog saves
  const refreshCallbackRef = React.useRef<(() => void) | null>(null);

  const handleAttachSkills = useCallback(
    async (currentSkillIds: number[], refresh?: () => void) => {
      const authorId = Number(id);
      if (!authorId) return;

      // Store refresh callback for use after save
      refreshCallbackRef.current = refresh || null;

      // Load all skills once
      const allSkills = await buiDatabase.authorSkills.toArray();

      admin.dialog.openDialog({
        title: "Select Skills to Attach",
        actionId: "attach-skills",
        contentOnly: true,
        hideFooter: true,
        size: "xl",
        fullHeight: false,
        children: React.createElement(BUISkillSelectorDialogContent, {
          allSkills,
          initialSelectedIds: currentSkillIds,
          onSave: async (selectedIds) => {
            await relationRepo.attachSkillsToAuthor(authorId, selectedIds);
            admin.dialog.closeDialog();
            // Refresh the inline skill list after save
            refreshCallbackRef.current?.();
          },
          onCancel: () => admin.dialog.closeDialog(),
        }),
        onConfirm: async () => ({ success: true }),
      });
    },
    [id, admin, relationRepo],
  );

  // Only render in view mode
  if (mode !== "view" || !id) return null;

  return (
    <div className="border-t border-default-200 mt-4 pt-4 px-6 pb-4">
      <BUIAuthorSkillAttach
        authorId={Number(id)}
        onAttachSkills={handleAttachSkills}
      />
    </div>
  );
}
