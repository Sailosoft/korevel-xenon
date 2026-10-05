"use client";

// BDArchitectureGroup.Component — modal form for creating/renaming an
// architecture group.

import { useState } from "react";
import type { BDArchitectureGroup } from "../../BDDomain.Types";
import {
  BD_ARCHITECTURE_GROUP_EMPTY,
  toArchitectureGroupForm,
  type BDArchitectureGroupForm,
} from "./BDArchitecture.Types";
import BDModal from "../../components/BDModal";
import BDForm from "../../components/BDForm";

export interface BDArchitectureGroupComponentProps {
  open: boolean;
  group?: BDArchitectureGroup | null;
  isLoading?: boolean;
  onClose: () => void;
  onSubmit: (form: BDArchitectureGroupForm) => void;
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

export function BDArchitectureGroupComponent({
  open,
  group,
  isLoading,
  onClose,
  onSubmit,
}: BDArchitectureGroupComponentProps) {
  const [form, setForm] = useState<BDArchitectureGroupForm>(
    BD_ARCHITECTURE_GROUP_EMPTY,
  );

  const modalKey = `${open}:${group?.id ?? "new"}`;
  const [prevKey, setPrevKey] = useState(modalKey);
  if (modalKey !== prevKey) {
    setPrevKey(modalKey);
    setForm(group ? toArchitectureGroupForm(group) : BD_ARCHITECTURE_GROUP_EMPTY);
  }

  return (
    <BDModal
      open={open}
      onClose={onClose}
      title={group ? "Rename group" : "New architecture group"}
      description="Groups organise architecture documents into sets."
      size="md"
    >
      <BDForm
        fields={FIELDS}
        value={form as unknown as Record<string, unknown>}
        onChange={(v) => setForm(v as unknown as BDArchitectureGroupForm)}
        onSubmit={(v) => onSubmit(v as unknown as BDArchitectureGroupForm)}
        onCancel={onClose}
        isLoading={isLoading}
        submitLabel={group ? "Save group" : "Create group"}
      />
    </BDModal>
  );
}

export default BDArchitectureGroupComponent;
