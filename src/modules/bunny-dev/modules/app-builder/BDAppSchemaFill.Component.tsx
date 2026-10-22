"use client";

// BDAppSchemaFill — bulk-fill a resource's form fields and table columns from
// its tied schema model. Two independent checkbox groups: form fields and
// table columns. Applying syncs schema-linked entries (unchecked links are
// removed, manual entries are preserved) and appends newly checked properties.

import { useState } from "react";
import { Database } from "lucide-react";
import type {
  BDAppColumn,
  BDAppField,
  BDSchemaModel,
} from "../../BDDomain.Types";
import {
  applySchemaSelection,
  isPrimaryProperty,
  schemaSelectionFromResource,
  type BDAppSchemaSelection,
} from "./BDApp.Types";
import BDModal from "../../components/BDModal";
import BDButton from "../../components/BDButton";

export interface BDAppSchemaFillProps {
  open: boolean;
  onClose: () => void;
  /** The resource's tied schema model (null when none is tied). */
  model: BDSchemaModel | null;
  fields: BDAppField[];
  columns: BDAppColumn[];
  onApply: (next: { fields: BDAppField[]; columns: BDAppColumn[] }) => void;
}

type Side = "form" | "columns";

const ROW =
  "flex items-center gap-2 rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-50";

export function BDAppSchemaFillComponent({
  open,
  onClose,
  model,
  fields,
  columns,
  onApply,
}: BDAppSchemaFillProps) {
  const [selection, setSelection] = useState<BDAppSchemaSelection>(() =>
    open && model
      ? schemaSelectionFromResource(model, fields, columns)
      : { form: [], columns: [] },
  );

  // Reset the selection whenever the dialog opens or the model changes.
  const key = `${open}:${model?.id ?? ""}`;
  const [prevKey, setPrevKey] = useState(key);
  if (key !== prevKey) {
    setPrevKey(key);
    if (open && model) {
      setSelection(schemaSelectionFromResource(model, fields, columns));
    }
  }

  const toggle = (side: Side, name: string) => {
    setSelection((prev) => {
      const current = new Set(prev[side]);
      if (current.has(name)) current.delete(name);
      else current.add(name);
      return { ...prev, [side]: [...current] };
    });
  };

  const setSide = (side: Side, names: string[]) =>
    setSelection((prev) => ({ ...prev, [side]: names }));

  const apply = () => {
    if (!model) return;
    onApply(applySchemaSelection(model, fields, columns, selection));
    onClose();
  };

  const panel = (side: Side, title: string) => {
    const selected = new Set(selection[side]);
    const allNames = (model?.properties ?? []).map((property) => property.name);
    return (
      <section className="flex min-h-0 flex-col gap-2 rounded-lg border border-slate-200 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-700">
            {title} <span className="text-slate-400">({selected.size})</span>
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSide(side, allNames)}
              className="rounded px-1.5 py-0.5 text-[11px] text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setSide(side, [])}
              className="rounded px-1.5 py-0.5 text-[11px] text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="bd-scroll flex max-h-64 flex-col gap-0.5 overflow-y-auto">
          {(model?.properties ?? []).map((property) => (
            <label key={property.name} className={ROW}>
              <input
                type="checkbox"
                checked={selected.has(property.name)}
                onChange={() => toggle(side, property.name)}
              />
              <span className="min-w-0 flex-1 truncate font-medium">
                {property.name}
              </span>
              <span className="shrink-0 text-[10px] text-slate-400">
                {property.type}
                {model && isPrimaryProperty(model, property) ? " · pk" : ""}
              </span>
            </label>
          ))}
        </div>
      </section>
    );
  };

  return (
    <BDModal
      open={open}
      onClose={onClose}
      size="lg"
      title="Fill from schema"
      description={
        model
          ? `Choose which properties of ${model.name} become form fields and table columns.`
          : "No schema model is tied to this resource."
      }
      footer={
        <>
          <BDButton variant="ghost" onClick={onClose}>
            Cancel
          </BDButton>
          <BDButton icon={Database} onClick={apply} disabled={!model}>
            Apply
          </BDButton>
        </>
      }
    >
      {model ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {panel("form", "Form fields")}
            {panel("columns", "Table columns")}
          </div>
          <p className="text-[11px] text-slate-400">
            Unchecking a schema-linked item removes it on Apply; manually
            created fields and columns are preserved. Defaults preselect the
            first three table properties and the first three non-primary form
            properties.
          </p>
        </div>
      ) : (
        <p className="py-6 text-center text-xs text-slate-400">
          Tie a schema model to this resource first.
        </p>
      )}
    </BDModal>
  );
}

export default BDAppSchemaFillComponent;
