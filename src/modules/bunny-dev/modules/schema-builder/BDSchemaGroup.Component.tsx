"use client";

// BDSchemaGroup.Component — modal form for creating/renaming a schema group.

import { useState } from "react";
import type { BDSchemaGroup } from "../../BDDomain.Types";
import type { BDSchemaGroupForm } from "./BDSchemaBuilder.Types";
import { BD_SCHEMA_GROUP_EMPTY, toGroupForm } from "./BDSchemaBuilder.Types";
import BDModal from "../../components/BDModal";
import BDForm from "../../components/BDForm";

export interface BDSchemaGroupComponentProps {
  open: boolean;
  group?: BDSchemaGroup | null;
  isLoading?: boolean;
  onClose: () => void;
  onSubmit: (form: BDSchemaGroupForm) => void;
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

export function BDSchemaGroupComponent({
  open,
  group,
  isLoading,
  onClose,
  onSubmit,
}: BDSchemaGroupComponentProps) {
  const [form, setForm] = useState<BDSchemaGroupForm>(BD_SCHEMA_GROUP_EMPTY);

  // Reset the local form when the modal opens or targets a different group
  // (render-time adjustment instead of a setState-in-effect).
  const modalKey = `${open}:${group?.id ?? "new"}`;
  const [prevKey, setPrevKey] = useState(modalKey);
  if (modalKey !== prevKey) {
    setPrevKey(modalKey);
    setForm(group ? toGroupForm(group) : BD_SCHEMA_GROUP_EMPTY);
  }

  return (
    <BDModal
      open={open}
      onClose={onClose}
      title={group ? "Rename group" : "New schema group"}
      description="Groups hold versions or variants of a schema."
      size="md"
    >
      <BDForm
        fields={FIELDS}
        value={form as unknown as Record<string, unknown>}
        onChange={(v) => setForm(v as unknown as BDSchemaGroupForm)}
        onSubmit={(v) => onSubmit(v as unknown as BDSchemaGroupForm)}
        onCancel={onClose}
        isLoading={isLoading}
        submitLabel={group ? "Save group" : "Create group"}
      />
    </BDModal>
  );
}

export default BDSchemaGroupComponent;
