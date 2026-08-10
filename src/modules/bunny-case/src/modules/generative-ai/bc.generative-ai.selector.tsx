// bc.generative-ai.selector.tsx
//
// Reusable training-mode selector used by the Simulator, Trainer and Gauntlet
// configuration panels. It renders the built-in Generative AI options and
// reports the selected id up to the owning hook.

"use client";

import type { BCGenAIOptionId } from "./bc.generative-ai.entity";
import { bcGenAIOptionList, BC_GEN_AI_DEFAULT_OPTION_ID } from "./bc.generative-ai.entity";

export interface BCGenAIOptionSelectorProps {
  /** The currently selected option id. */
  value: BCGenAIOptionId;
  /** Called whenever the user picks a different option. */
  onChange: (id: BCGenAIOptionId) => void;
  /** Optional label; defaults to "Training Mode". */
  label?: string;
}

export function BCGenAIOptionSelector({
  value,
  onChange,
  label = "Training Mode",
}: BCGenAIOptionSelectorProps) {
  const options = bcGenAIOptionList();
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 uppercase">
        {label}
      </label>
      <select
        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        value={value ?? BC_GEN_AI_DEFAULT_OPTION_ID}
        onChange={(e) => onChange(e.target.value as BCGenAIOptionId)}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <p className="text-[11px] text-slate-400 mt-1">
        {
          options.find((o) => o.id === (value ?? BC_GEN_AI_DEFAULT_OPTION_ID))
            ?.description
        }
      </p>
    </div>
  );
}
