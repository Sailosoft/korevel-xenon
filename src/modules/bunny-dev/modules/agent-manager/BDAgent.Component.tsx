"use client";

// BDAgent.Component — modal editor for one agent.

import { useState } from "react";
import type { BDAgent } from "../../BDDomain.Types";
import { BD_AGENT_EMPTY_FORM, toAgentForm, type BDAgentForm } from "./BDAgent.Types";
import BDModal from "../../components/BDModal";
import BDForm from "../../components/BDForm";

export interface BDAgentComponentProps {
  open: boolean;
  agent: BDAgent | null;
  isLoading?: boolean;
  onClose: () => void;
  onSubmit: (form: BDAgentForm) => void;
}

const AGENT_FIELDS = [
  { name: "name", label: "Name", type: "text" as const, required: true },
  { name: "model", label: "Model override", type: "text" as const },
  { name: "provider", label: "Provider override", type: "text" as const },
  { name: "enabled", label: "Enabled", type: "toggle" as const },
  {
    name: "description",
    label: "Description",
    type: "textarea" as const,
    columnSpan: "full" as const,
  },
  {
    name: "prompt",
    label: "System prompt",
    type: "textarea" as const,
    columnSpan: "full" as const,
    rows: 8,
    required: true,
  },
];

export function BDAgentComponent({
  open,
  agent,
  isLoading,
  onClose,
  onSubmit,
}: BDAgentComponentProps) {
  const [form, setForm] = useState<BDAgentForm>(BD_AGENT_EMPTY_FORM);

  const modalKey = `${open}:${agent?.id ?? "new"}`;
  const [prevKey, setPrevKey] = useState(modalKey);
  if (modalKey !== prevKey) {
    setPrevKey(modalKey);
    setForm(agent ? toAgentForm(agent) : BD_AGENT_EMPTY_FORM);
  }

  return (
    <BDModal
      open={open}
      onClose={onClose}
      title={agent ? `Edit ${agent.name}` : "New agent"}
      size="lg"
    >
      <BDForm
        fields={AGENT_FIELDS}
        value={form as unknown as Record<string, unknown>}
        onChange={(v) => setForm(v as unknown as BDAgentForm)}
        onSubmit={(v) => onSubmit(v as unknown as BDAgentForm)}
        onCancel={onClose}
        isLoading={isLoading}
        submitLabel={agent ? "Save agent" : "Create agent"}
      />
    </BDModal>
  );
}

export default BDAgentComponent;
