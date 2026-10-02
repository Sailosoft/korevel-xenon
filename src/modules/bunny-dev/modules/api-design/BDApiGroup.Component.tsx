"use client";

// BDApiGroup.Component — modal form for creating/renaming an API design group.

import { useState } from "react";
import type { BDApiGroup } from "../../BDDomain.Types";
import {
  BD_API_GROUP_EMPTY,
  toGroupForm,
  type BDApiGroupForm,
} from "./BDApi.Types";
import BDModal from "../../components/BDModal";
import BDForm from "../../components/BDForm";

export interface BDApiGroupComponentProps {
  open: boolean;
  group?: BDApiGroup | null;
  isLoading?: boolean;
  onClose: () => void;
  onSubmit: (form: BDApiGroupForm) => void;
}

const FIELDS = [
  { name: "name", label: "Group name", type: "text" as const, required: true },
  {
    name: "description",
    label: "Description",
    type: "textarea" as const,
    columnSpan: "full" as const,
  },
];

export function BDApiGroupComponent({
  open,
  group,
  isLoading,
  onClose,
  onSubmit,
}: BDApiGroupComponentProps) {
  const [form, setForm] = useState<BDApiGroupForm>(BD_API_GROUP_EMPTY);

  // Reset the local form when the modal opens or targets a different group
  // (render-time adjustment instead of a setState-in-effect).
  const modalKey = `${open}:${group?.id ?? "new"}`;
  const [prevKey, setPrevKey] = useState(modalKey);
  if (modalKey !== prevKey) {
    setPrevKey(modalKey);
    setForm(group ? toGroupForm(group) : BD_API_GROUP_EMPTY);
  }

  return (
    <BDModal
      open={open}
      onClose={onClose}
      title={group ? "Rename group" : "New API group"}
      description="Groups hold variants of an API design."
      size="md"
    >
      <BDForm
        fields={FIELDS}
        value={form as unknown as Record<string, unknown>}
        onChange={(v) => setForm(v as unknown as BDApiGroupForm)}
        onSubmit={(v) => onSubmit(v as unknown as BDApiGroupForm)}
        onCancel={onClose}
        isLoading={isLoading}
        submitLabel={group ? "Save group" : "Create group"}
      />
    </BDModal>
  );
}

export default BDApiGroupComponent;
