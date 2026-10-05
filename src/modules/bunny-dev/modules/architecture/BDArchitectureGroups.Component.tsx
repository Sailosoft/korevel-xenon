"use client";

// BDArchitectureGroups.Component — Architecture page 1: the list of
// architecture groups.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import type { BDArchitectureGroup } from "../../BDDomain.Types";
import { useBDProjectContext } from "../core/BDProject.Context";
import { bdArchitectureGroupRepository } from "./BDArchitecture.Repository";
import {
  useBDArchitectureGroups,
  useBDArchitectures,
} from "./BDArchitecture.Hooks";
import type { BDArchitectureGroupForm } from "./BDArchitecture.Types";
import BDArchitectureGroupComponent from "./BDArchitectureGroup.Component";
import BDGroupList from "../../components/BDGroupList";
import BDConfirmDialog from "../../components/BDConfirmDialog";
import { useBDToast } from "../../components/BDToast";

export function BDArchitectureGroupListComponent() {
  const { projectId } = useBDProjectContext();
  const { toast } = useBDToast();
  const router = useRouter();

  const groups = useBDArchitectureGroups(projectId);
  const records = useBDArchitectures(projectId);

  const [groupModal, setGroupModal] = useState<{
    open: boolean;
    group: BDArchitectureGroup | null;
    busy: boolean;
  }>({ open: false, group: null, busy: false });
  const [deletingGroup, setDeletingGroup] =
    useState<BDArchitectureGroup | null>(null);

  const hrefFor = (group: BDArchitectureGroup) =>
    `/modules/bunny-dev/projects/${projectId}/architecture/${group.id}`;

  const handleGroupSubmit = async (form: BDArchitectureGroupForm) => {
    setGroupModal((prev) => ({ ...prev, busy: true }));
    try {
      if (groupModal.group) {
        await bdArchitectureGroupRepository.update(groupModal.group.id, {
          name: form.name,
          description: form.description,
        });
        setGroupModal({ open: false, group: null, busy: false });
        toast({ title: "Group saved", status: "success" });
      } else {
        const created = await bdArchitectureGroupRepository.createGroup(
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
    await bdArchitectureGroupRepository.delete(deletingGroup.id);
    setDeletingGroup(null);
    toast({ title: "Group deleted", status: "success" });
  };

  const countFor = (group: BDArchitectureGroup) =>
    (records ?? []).filter((r) => r.groupId === group.id).length;

  return (
    <>
      <BDGroupList<BDArchitectureGroup>
        icon={Building2}
        title="Architecture Design"
        description="Author architecture docs, ADRs, RFCs, plans, and variants — with markdown export and side-by-side comparison."
        newLabel="New group"
        groups={groups}
        countNoun="documents"
        countFor={countFor}
        hrefFor={hrefFor}
        onNew={() => setGroupModal({ open: true, group: null, busy: false })}
        onEdit={(group) => setGroupModal({ open: true, group, busy: false })}
        onDelete={(group) => setDeletingGroup(group)}
      />

      <BDArchitectureGroupComponent
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

export default BDArchitectureGroupListComponent;
