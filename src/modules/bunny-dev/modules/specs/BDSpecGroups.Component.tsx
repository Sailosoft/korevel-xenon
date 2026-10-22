"use client";

// BDSpecGroups.Component — Specs page 1: the list of
// spec groups.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import type { BDSpecGroup } from "../../BDDomain.Types";
import { useBDProjectContext } from "../core/BDProject.Context";
import { bdSpecGroupRepository } from "./BDSpec.Repository";
import {
  useBDSpecGroups,
  useBDSpecs,
} from "./BDSpec.Hooks";
import type { BDSpecGroupForm } from "./BDSpec.Types";
import BDSpecGroupComponent from "./BDSpecGroup.Component";
import BDGroupList from "../../components/BDGroupList";
import BDConfirmDialog from "../../components/BDConfirmDialog";
import { useBDToast } from "../../components/BDToast";

export function BDSpecGroupListComponent() {
  const { projectId } = useBDProjectContext();
  const { toast } = useBDToast();
  const router = useRouter();

  const groups = useBDSpecGroups(projectId);
  const records = useBDSpecs(projectId);

  const [groupModal, setGroupModal] = useState<{
    open: boolean;
    group: BDSpecGroup | null;
    busy: boolean;
  }>({ open: false, group: null, busy: false });
  const [deletingGroup, setDeletingGroup] =
    useState<BDSpecGroup | null>(null);

  const hrefFor = (group: BDSpecGroup) =>
    `/modules/bunny-dev/projects/${projectId}/specs/${group.id}`;

  const handleGroupSubmit = async (form: BDSpecGroupForm) => {
    setGroupModal((prev) => ({ ...prev, busy: true }));
    try {
      if (groupModal.group) {
        await bdSpecGroupRepository.update(groupModal.group.id, {
          name: form.name,
          description: form.description,
        });
        setGroupModal({ open: false, group: null, busy: false });
        toast({ title: "Group saved", status: "success" });
      } else {
        const created = await bdSpecGroupRepository.createGroup(
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
    await bdSpecGroupRepository.delete(deletingGroup.id);
    setDeletingGroup(null);
    toast({ title: "Group deleted", status: "success" });
  };

  const countFor = (group: BDSpecGroup) =>
    (records ?? []).filter((r) => r.groupId === group.id).length;

  return (
    <>
      <BDGroupList<BDSpecGroup>
        icon={Building2}
        title="Specs"
        description="Author spec docs, ADRs, RFCs, plans, and variants — with markdown export and side-by-side comparison."
        newLabel="New group"
        groups={groups}
        countNoun="documents"
        countFor={countFor}
        hrefFor={hrefFor}
        onNew={() => setGroupModal({ open: true, group: null, busy: false })}
        onEdit={(group) => setGroupModal({ open: true, group, busy: false })}
        onDelete={(group) => setDeletingGroup(group)}
      />

      <BDSpecGroupComponent
        open={groupModal.open}
        group={groupModal.group}
        isLoading={groupModal.busy}
        onClose={() => setGroupModal({ open: false, group: null, busy: false })}
        onSubmit={handleGroupSubmit}
      />

      <BDConfirmDialog
        open={!!deletingGroup}
        title={`Delete ${deletingGroup?.name ?? "group"}?`}
        description="All documents in this group will be deleted."
        confirmLabel="Delete group"
        onConfirm={handleDeleteGroup}
        onCancel={() => setDeletingGroup(null)}
      />
    </>
  );
}

export default BDSpecGroupListComponent;
