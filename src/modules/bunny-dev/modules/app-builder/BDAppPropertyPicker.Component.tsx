"use client";

// BDAppPropertyPicker — pick one schema property of a model. Used by the form
// and table designers' "Add field"/"Add column" flows when a resource's
// schema and table are tied up: picking a property pre-fills the field/column
// (name, label, required, derived type) with a persisted schema link.

import { useMemo, useState } from "react";
import { Database, Search } from "lucide-react";
import type { BDSchemaModel, BDSchemaProperty } from "../../BDDomain.Types";
import BDModal from "../../components/BDModal";

export interface BDAppPropertyPickerProps {
  open: boolean;
  onClose: () => void;
  /** The resource's tied schema model (properties are the candidates). */
  model: BDSchemaModel | null;
  /** Property names to exclude (already mapped to fields/columns). */
  excludeNames?: string[];
  onSelect: (property: BDSchemaProperty) => void;
}

export function BDAppPropertyPicker({
  open,
  onClose,
  model,
  excludeNames = [],
  onSelect,
}: BDAppPropertyPickerProps) {
  const [query, setQuery] = useState("");

  // Reset the picker whenever it is dismissed (render-time adjustment, same
  // pattern as BDAppSchemaFill's open-key reset).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) setQuery("");
  }

  const excluded = useMemo(() => new Set(excludeNames), [excludeNames]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = (model?.properties ?? []).filter(
      (p) => !excluded.has(p.name),
    );
    return q ? rows.filter((p) => p.name.toLowerCase().includes(q)) : rows;
  }, [model, excluded, query]);

  const pick = (property: BDSchemaProperty) => {
    onSelect(property);
    onClose();
  };

  return (
    <BDModal
      open={open}
      onClose={onClose}
      title="Pick a schema property"
      description={
        model
          ? `Add a property of ${model.name} as ${
              model.table ? `a column of ${model.table}` : "a resource property"
            }.`
          : "No schema model is tied to this resource."
      }
    >
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded border border-slate-200 bg-white py-1.5 pl-7 pr-2 text-sm outline-none focus:border-blue-400"
            placeholder="Search properties…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {filtered.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">
            {!(model?.properties.length)
              ? "This model has no properties yet."
              : excluded.size > 0
                ? "All of this model's properties are already mapped."
                : "No property matches the search."}
          </p>
        ) : (
          <div className="bd-scroll flex max-h-80 flex-col gap-1 overflow-y-auto">
            {filtered.map((property) => (
              <button
                key={property.name}
                type="button"
                onClick={() => pick(property)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
              >
                <Database className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-700">
                    {property.name}
                  </span>
                  <span className="block truncate text-[11px] text-slate-400">
                    {property.type}
                    {property.primary ? " · pk" : ""}
                    {property.nullable && !property.primary ? " · nullable" : ""}
                    {property.unique && !property.primary ? " · unique" : ""}
                    {property.values?.length
                      ? ` · ${property.values.length} values`
                      : ""}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </BDModal>
  );
}

export default BDAppPropertyPicker;
