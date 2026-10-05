"use client";

// BDApiGroups.Component — API Design page 1: the list of API groups.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Webhook } from "lucide-react";
import type { BDApiGroup } from "../../BDDomain.Types";
import { useBDProjectContext } from "../core/BDProject.Context";
import { bdApiGroupRepository } from "./BDApi.Repository";
import { useBDApis, useBDApiGroups } from "./BDApi.Hooks";
import type { BDApiGroupForm } from "./BDApi.Types";
import BDApiGroupComponent from "./BDApiGroup.Component";
import BDGroupList from "../../components/BDGroupList";
import BDConfirmDialog from "../../components/BDConfirmDialog";
import { useBDToast } from "../../components/BDToast";

export function BDApiGroupListComponent() {
  const { projectId } = useBDProjectContext();
  const { toast } = useBDToast();
  const router = useRouter();

  const groups = useBDApiGroups(projectId);
  const apis = useBDApis(projectId);

  const [groupModal, setGroupModal] = useState<{
    open: boolean;
    group: BDApiGroup | null;
    busy: boolean;
  }>({ open: false, group: null, busy: false });
  const [deletingGroup, setDeletingGroup] = useState<BDApiGroup | null>(null);

  const hrefFor = (group: BDApiGroup) =>
    `/modules/bunny-dev/projects/${projectId}/api/${group.id}`;

  const handleGroupSubmit = async (form: BDApiGroupForm) => {
    setGroupModal((prev) => ({ ...prev, busy: true }));
    try {
      if (groupModal.group) {
        await bdApiGroupRepository.update(groupModal.group.id, {
          name: form.name,
          description: form.description,
        });
        setGroupModal({ open: false, group: null, busy: false });
        toast({ title: "Group saved", status: "success" });
      } else {
        const created = await bdApiGroupRepository.createGroup(
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
    await bdApiGroupRepository.delete(deletingGroup.id);
    setDeletingGroup(null);
    toast({ title: "Group deleted", status: "success" });
  };

  const countFor = (group: BDApiGroup) =>
    (apis ?? []).filter((a) => a.groupId === group.id).length;

  return (
    <>
      <BDGroupList<BDApiGroup>
        icon={Webhook}
        title="API Design"
        description="Document and mock API operations in a Postman-like view and an exportable document view."
        newLabel="New group"
        groups={groups}
        countNoun="operations"
        countFor={countFor}
        hrefFor={hrefFor}
        onNew={() => setGroupModal({ open: true, group: null, busy: false })}
        onEdit={(group) => setGroupModal({ open: true, group, busy: false })}
        onDelete={(group) => setDeletingGroup(group)}
      />

      <BDApiGroupComponent
        open={groupModal.open}
        group={groupModal.group}
        isLoading={groupModal.busy}
        onClose={() => setGroupModal({ open: false, group: null, busy: false })}
        onSubmit={handleGroupSubmit}
      />

      <BDConfirmDialog
        open={!!deletingGroup}
        title={`Delete ${deletingGroup?.name ?? "group"}?`}
        description="All operations in this group will be deleted."
        confirmLabel="Delete group"
        onConfirm={handleDeleteGroup}
        onCancel={() => setDeletingGroup(null)}
      />
    </>
  );
}

export default BDApiGroupListComponent;
