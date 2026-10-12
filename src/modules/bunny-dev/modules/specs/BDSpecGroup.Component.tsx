"use client";

// BDSpecGroup.Component — modal form for creating/renaming a
// spec group.

import { useState } from "react";
import type { BDSpecGroup } from "../../BDDomain.Types";
import {
  BD_SPEC_GROUP_EMPTY,
  toSpecGroupForm,
  type BDSpecGroupForm,
} from "./BDSpec.Types";
import BDModal from "../../components/BDModal";
import BDForm from "../../components/BDForm";

export interface BDSpecGroupComponentProps {
  open: boolean;
  group?: BDSpecGroup | null;
  isLoading?: boolean;
  onClose: () => void;
  onSubmit: (form: BDSpecGroupForm) => void;
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

export function BDSpecGroupComponent({
  open,
  group,
  isLoading,
  onClose,
  onSubmit,
}: BDSpecGroupComponentProps) {
  const [form, setForm] = useState<BDSpecGroupForm>(
    BD_SPEC_GROUP_EMPTY,
  );

  const modalKey = `${open}:${group?.id ?? "new"}`;
  const [prevKey, setPrevKey] = useState(modalKey);
  if (modalKey !== prevKey) {
    setPrevKey(modalKey);
    setForm(group ? toSpecGroupForm(group) : BD_SPEC_GROUP_EMPTY);
  }

  return (
    <BDModal
      open={open}
      onClose={onClose}
      title={group ? "Rename group" : "New spec group"}
      description="Groups organise spec documents into sets."
      size="md"
    >
      <BDForm
        fields={FIELDS}
        value={form as unknown as Record<string, unknown>}
        onChange={(v) => setForm(v as unknown as BDSpecGroupForm)}
        onSubmit={(v) => onSubmit(v as unknown as BDSpecGroupForm)}
        onCancel={onClose}
        isLoading={isLoading}
        submitLabel={group ? "Save group" : "Create group"}
      />
    </BDModal>
  );
}

export default BDSpecGroupComponent;
