"use client";

// BDDiagramGroups.Component — Diagram Builder page 1: the list of diagram
// groups.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Workflow } from "lucide-react";
import type { BDDiagramGroup } from "../../BDDomain.Types";
import { useBDProjectContext } from "../core/BDProject.Context";
import { bdDiagramGroupRepository } from "./BDDiagram.Repository";
import { useBDDiagramGroups, useBDDiagrams } from "./BDDiagram.Hooks";
import type { BDDiagramGroupForm } from "./BDDiagram.Types";
import BDDiagramGroupComponent from "./BDDiagramGroup.Component";
import BDGroupList from "../../components/BDGroupList";
import BDConfirmDialog from "../../components/BDConfirmDialog";
import { useBDToast } from "../../components/BDToast";

export function BDDiagramGroupListComponent() {
  const { projectId } = useBDProjectContext();
  const { toast } = useBDToast();
  const router = useRouter();

  const groups = useBDDiagramGroups(projectId);
  const diagrams = useBDDiagrams(projectId);

  const [groupModal, setGroupModal] = useState<{
    open: boolean;
    group: BDDiagramGroup | null;
    busy: boolean;
  }>({ open: false, group: null, busy: false });
  const [deletingGroup, setDeletingGroup] = useState<BDDiagramGroup | null>(
    null,
  );

  const hrefFor = (group: BDDiagramGroup) =>
    `/modules/bunny-dev/projects/${projectId}/diagram/${group.id}`;

  const handleGroupSubmit = async (form: BDDiagramGroupForm) => {
    setGroupModal((prev) => ({ ...prev, busy: true }));
    try {
      if (groupModal.group) {
        await bdDiagramGroupRepository.update(groupModal.group.id, {
          name: form.name,
          description: form.description,
        });
        setGroupModal({ open: false, group: null, busy: false });
        toast({ title: "Group saved", status: "success" });
      } else {
        const created = await bdDiagramGroupRepository.createGroup(
          projectId,
          form.name,
          form.description,
        );
        setGroupModal({ open: false, group: null, busy: false });
        toast({ title: "Group created", status: "success" });
        router.push(hrefFor(created));
      }
    } catch (err) {
      setGroupModal((prev) => ({ ...prev, busy: false }));
      toast({
        title: "Could not save group",
        description: err instanceof Error ? err.message : undefined,
        status: "error",
      });
    }
  };

  const handleDeleteGroup = async () => {
    if (!deletingGroup) return;
    await bdDiagramGroupRepository.delete(deletingGroup.id);
    setDeletingGroup(null);
    toast({ title: "Group deleted", status: "success" });
  };

  const countFor = (group: BDDiagramGroup) =>
    (diagrams ?? []).filter((d) => d.groupId === group.id).length;

  return (
    <>
      <BDGroupList<BDDiagramGroup>
        icon={Workflow}
        title="Diagram Builder"
        description="Create Mermaid diagrams with a type-specific node/edge editor, a raw-source override, live preview, and export."
        newLabel="New group"
        groups={groups}
        countNoun="diagrams"
        countFor={countFor}
        hrefFor={hrefFor}
        onNew={() => setGroupModal({ open: true, group: null, busy: false })}
        onEdit={(group) => setGroupModal({ open: true, group, busy: false })}
        onDelete={(group) => setDeletingGroup(group)}
      />

      <BDDiagramGroupComponent
        open={groupModal.open}
        group={groupModal.group}
        isLoading={groupModal.busy}
        onClose={() => setGroupModal({ open: false, group: null, busy: false })}
        onSubmit={handleGroupSubmit}
      />

      <BDConfirmDialog
        open={!!deletingGroup}
        title={`Delete ${deletingGroup?.name ?? "group"}?`}
        description="All diagrams in this group will be deleted."
        confirmLabel="Delete group"
        onConfirm={handleDeleteGroup}
        onCancel={() => setDeletingGroup(null)}
      />
    </>
  );
}

export default BDDiagramGroupListComponent;
