"use client";

// BDAppFiller.Component — a one-field ("Name") helper modal used to derive
// identity values (slug, path, brand, labels) for apps and resources.

import { useState } from "react";
import { Wand2 } from "lucide-react";
import BDModal from "../../components/BDModal";
import BDButton from "../../components/BDButton";

const CELL =
  "w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-400";

export interface BDAppFillerComponentProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  label?: string;
  placeholder?: string;
  submitLabel?: string;
  initialName?: string;
  onSubmit: (name: string) => void;
}

export function BDAppFillerComponent({
  open,
  onClose,
  title,
  description,
  label = "Name",
  placeholder = "e.g. Product",
  submitLabel = "Fill details",
  initialName = "",
  onSubmit,
}: BDAppFillerComponentProps) {
  const [name, setName] = useState(initialName);

  const openKey = `${open}:${initialName}`;
  const [prevKey, setPrevKey] = useState(openKey);
  if (openKey !== prevKey) {
    setPrevKey(openKey);
    setName(initialName);
  }

  const submit = () => {
    if (!name.trim()) return;
    onSubmit(name.trim());
    onClose();
  };

  return (
    <BDModal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <BDButton variant="ghost" onClick={onClose}>
            Cancel
          </BDButton>
          <BDButton icon={Wand2} onClick={submit} disabled={!name.trim()}>
            {submitLabel}
          </BDButton>
        </>
      }
    >
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <input
          className={CELL}
          value={name}
          autoFocus
          placeholder={placeholder}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
      </label>
    </BDModal>
  );
}

export default BDAppFillerComponent;
