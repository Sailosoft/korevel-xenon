"use client";

// BDAppCreate.Component — dialog for creating a new app: name (identity is
// derived from it) plus an optional tie to a schema design (schema group).
// When a group is picked, the app's resources can be tied to its models and
// mapped to its properties.

import { useState } from "react";
import { Wand2 } from "lucide-react";
import { useBDSchemaGroups } from "../schema-builder/BDSchemaBuilder.Hooks";
import BDModal from "../../components/BDModal";
import BDButton from "../../components/BDButton";

const CELL =
  "w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-400";

export interface BDAppCreateComponentProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  /** Called with the app name and the optionally-tied schema group id. */
  onSubmit: (values: { name: string; schemaGroupId: string }) => void;
}

export function BDAppCreateComponent({
  open,
  onClose,
  projectId,
  onSubmit,
}: BDAppCreateComponentProps) {
  const groups = useBDSchemaGroups(projectId);
  const [name, setName] = useState("");
  const [schemaGroupId, setSchemaGroupId] = useState("");

  // Reset the dialog whenever it is dismissed (render-time adjustment, same
  // pattern as BDAppFillerComponent's deep-key reset).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      setName("");
      setSchemaGroupId("");
    }
  }

  const submit = () => {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), schemaGroupId });
    onClose();
  };

  return (
    <BDModal
      open={open}
      onClose={onClose}
      title="New app"
      description="Enter a name to derive slug, path and brand; optionally tie a schema design."
      footer={
        <>
          <BDButton variant="ghost" onClick={onClose}>
            Cancel
          </BDButton>
          <BDButton icon={Wand2} onClick={submit} disabled={!name.trim()}>
            Create
          </BDButton>
        </>
      }
    >
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-600">
          Schema design (optional)
        </span>
        <select
          className={CELL}
          value={schemaGroupId}
          onChange={(e) => setSchemaGroupId(e.target.value)}
        >
          <option value="">None — untied app</option>
          {(groups ?? []).map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <span className="text-[11px] text-slate-400">
          Tying a schema lets resources pick models from that design and map
          their properties to resource fields/columns. You can change this
          later in App settings.
        </span>
      </label>

      <label className="mt-3 flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-600">App name</span>
        <input
          className={CELL}
          value={name}
          autoFocus
          placeholder="e.g. Shop Admin"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
      </label>
    </BDModal>
  );
}

export default BDAppCreateComponent;
