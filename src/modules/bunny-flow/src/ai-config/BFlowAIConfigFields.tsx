"use client";

import { Switch } from "@heroui/react";
import {
  HELIX_AI_MODELS,
  HELIX_PROVIDER_LABELS,
  isHelixProvider,
  type HelixAIProvider,
} from "@/src/modules/helix";
import type { BunnyFieldRendererProps } from "@/src/modules/bunny/src/form/BunnyForm.Interface";

// ─── AI Model Selector (custom field) ─────────────────────────────
//
// Renders a <select> populated with the models available for the
// currently-selected provider.  Watches `formData.provider` to stay
// in sync when the user changes providers.

export function BFlowAIModelSelector(props: BunnyFieldRendererProps) {
  const { value, onChange, formData, error } = props;
  const rawProvider = (formData.provider as string) ?? "default";
  const provider = isHelixProvider(rawProvider)
    ? (rawProvider as HelixAIProvider)
    : "default";

  const models = HELIX_AI_MODELS[provider] ?? HELIX_AI_MODELS.default;

  // If the current model value is not in the list, reset to the first model
  const currentValue = typeof value === "string" ? value : "";
  const safeValue = models.includes(currentValue) ? currentValue : models[0];

  return (
    <div className="flex flex-col gap-1">
      {/* <label className="text-sm font-medium text-slate-700">AI Model</label> */}
      <select
        className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        value={safeValue}
        onChange={(e) => onChange("model", e.target.value)}
      >
        {models.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <p className="text-[10px] text-slate-400">
        Models for{" "}
        <span className="font-medium">
          {HELIX_PROVIDER_LABELS[provider] ?? provider}
        </span>
      </p>
    </div>
  );
}

// ─── Active Toggle (render-compatible switch) ────────────────────
//
// Renders an on/off switch for the "active" field.
// Uses the HeroUI Switch component directly with the correct
// onChange → boolean signature from react-aria-components.

export function BFlowActiveToggle(props: BunnyFieldRendererProps) {
  const { value, onChange } = props;

  return (
    <div className="flex items-center gap-3">
      <Switch
        id="field-active"
        isSelected={Boolean(value)}
        onChange={(isSelected) => onChange("active", isSelected)}
      />
      <label
        htmlFor="field-active"
        className="text-sm font-medium cursor-pointer"
      >
        {Boolean(value) ? "Active" : "Inactive"}
      </label>
    </div>
  );
}
