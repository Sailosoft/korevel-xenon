"use client";

// BDAppFieldSelect.Component — dropdown of candidate field/column names for
// connection wiring (title attr, child fk, inverse name). Replaces manual
// typing with selecting real fields from the target resource. Unknown values
// are kept as a fallback option so nothing is ever lost.

import type { BDAppFieldOption } from "./BDApp.Types";

export interface BDAppFieldSelectProps {
  value: string;
  options: BDAppFieldOption[];
  placeholder?: string;
  /**
   * A conventional value (e.g. `<ownerSlug>Id` for a foreign key) offered as
   * the first option even when it is not an actual field of the target.
   */
  suggestion?: string;
  /** Full class override so callers can match their local cell sizing. */
  cell?: string;
  onChange: (value: string) => void;
}

const CELL =
  "rounded border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-400";

export function BDAppFieldSelect({
  value,
  options,
  placeholder = "Pick a field…",
  suggestion,
  cell,
  onChange,
}: BDAppFieldSelectProps) {
  // Prepend the suggestion (when it is not already a real field), and keep a
  // hand-typed value visible as its own option instead of hiding it.
  const suggestionOption: BDAppFieldOption[] =
    suggestion && !options.some((option) => option.value === suggestion)
      ? [{ value: suggestion, label: suggestion, hint: "suggested" }]
      : [];
  const valueOption: BDAppFieldOption[] =
    value && ![...suggestionOption, ...options].some((option) => option.value === value)
      ? [{ value, label: value, hint: "current" }]
      : [];
  const all = [...suggestionOption, ...options, ...valueOption];

  return (
    <select
      className={cell ?? CELL}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">{placeholder}</option>
      {all.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
          {option.hint ? ` · ${option.hint}` : ""}
        </option>
      ))}
    </select>
  );
}

export default BDAppFieldSelect;
