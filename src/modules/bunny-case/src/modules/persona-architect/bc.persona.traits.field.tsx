// bc.persona.traits.field.tsx
//
// Custom Bunny form field ("type: 'custom'") — a filterable multi-select of
// the 30 common human traits in BC_PERSONA_TRAITS. The value is stored as a
// comma-separated string so Bunny's string-oriented form handles it cleanly.

"use client";

import React, { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import type { BunnyFieldRendererProps } from "@/src/modules/bunny/src/form/BunnyForm.Interface";
import { BC_PERSONA_TRAITS } from "./bc.persona.traits";
import { bcPersonaParseList } from "./bc.persona.entity";

export default function BCPersonaTraitsField({
  field,
  value,
  onChange,
  error,
}: BunnyFieldRendererProps) {
  const [query, setQuery] = useState("");
  const selected = useMemo(() => bcPersonaParseList(String(value ?? "")), [value]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? BC_PERSONA_TRAITS.filter((t) => t.toLowerCase().includes(q))
      : BC_PERSONA_TRAITS;
  }, [query]);

  const toggle = (trait: string) => {
    const next = selected.includes(trait)
      ? selected.filter((t) => t !== trait)
      : [...selected, trait];
    onChange(field.name, next.join(", "));
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">
        {field.label}
        {field.rules?.some((r) => r.rule === "required") && (
          <span className="text-red-500 ml-1">*</span>
        )}
      </label>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((trait) => (
            <button
              key={trait}
              type="button"
              onClick={() => toggle(trait)}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-0.5 text-xs font-medium hover:bg-emerald-100 transition-colors"
            >
              {trait}
              <X className="w-3 h-3" />
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter traits…"
          className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
      </div>

      <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
        {visible.length === 0 && (
          <p className="text-xs text-slate-400 px-3 py-2">No matching traits.</p>
        )}
        {visible.map((trait) => {
          const isSelected = selected.includes(trait);
          return (
            <button
              key={trait}
              type="button"
              onClick={() => toggle(trait)}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-sm text-left transition-colors ${
                isSelected
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {trait}
              {isSelected && <Check className="w-4 h-4 text-emerald-600" />}
            </button>
          );
        })}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
