"use client";

// BDDiagramGroup.Component — modal form for creating/renaming a diagram group.

import { useState } from "react";
import type { BDDiagramGroup } from "../../BDDomain.Types";
import {
  BD_DIAGRAM_GROUP_EMPTY,
  toDiagramGroupForm,
  type BDDiagramGroupForm,
} from "./BDDiagram.Types";
import BDModal from "../../components/BDModal";
import BDForm from "../../components/BDForm";

export interface BDDiagramGroupComponentProps {
  open: boolean;
  group?: BDDiagramGroup | null;
  isLoading?: boolean;
  onClose: () => void;
  onSubmit: (form: BDDiagramGroupForm) => void;
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

export function BDDiagramGroupComponent({
  open,
  group,
  isLoading,
  onClose,
  onSubmit,
}: BDDiagramGroupComponentProps) {
  const [form, setForm] = useState<BDDiagramGroupForm>(BD_DIAGRAM_GROUP_EMPTY);

  const modalKey = `${open}:${group?.id ?? "new"}`;
  const [prevKey, setPrevKey] = useState(modalKey);
  if (modalKey !== prevKey) {
    setPrevKey(modalKey);
    setForm(group ? toDiagramGroupForm(group) : BD_DIAGRAM_GROUP_EMPTY);
  }

  return (
    <BDModal
      open={open}
      onClose={onClose}
      title={group ? "Rename group" : "New diagram group"}
      description="Groups organise diagrams into sets."
      size="md"
    >
      <BDForm
        fields={FIELDS}
        value={form as unknown as Record<string, unknown>}
        onChange={(v) => setForm(v as unknown as BDDiagramGroupForm)}
        onSubmit={(v) => onSubmit(v as unknown as BDDiagramGroupForm)}
        onCancel={onClose}
        isLoading={isLoading}
        submitLabel={group ? "Save group" : "Create group"}
      />
    </BDModal>
  );
}

export default BDDiagramGroupComponent;
