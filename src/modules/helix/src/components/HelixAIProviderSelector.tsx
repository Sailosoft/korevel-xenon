"use client"
/**
 * ───────────────────────────────────────────────────────────────────────────────
 * HelixAIProviderSelector — Generic AI Provider Selection Component
 * ───────────────────────────────────────────────────────────────────────────────
 * A reusable Tailwind component for selecting Helix AI providers and models.
 * Accepts any Dexie table conforming to the HelixAISettings schema.
 */

import { Table } from "dexie";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronDownIcon, CheckIcon } from "lucide-react";
import { useState } from "react";

import { cn } from "@/src/shadcnui/lib/utils";
import {
  HelixAIProvider,
  HELIX_PROVIDER_LABELS,
  HELIX_AI_MODELS,
  isHelixProvider,
} from "../HelixConfig";
import { HelixAISettings } from "../HelixAITypes";

// ── Component Props ─────────────────────────────────────────────────────────────

export interface HelixAIProviderSelectorProps<T extends Table<HelixAISettings>> {
  /** The Dexie table to read/write settings. Must have HelixAISettings schema. */
  table: T;
  /** Primary key value used to lookup/update settings (default: "default") */
  settingsKey?: string;
  /** css override for wrapper div */
  className?: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * HelixAIProviderSelector
 *
 * Renders a card-based UI with two dropdowns:
 * 1. Provider selection (populates model dropdown based on selection)
 * 2. Model selection (filtered by selected provider)
 *
 * Settings are persisted to the provided Dexie table on change.
 *
 * @example
 * ```tsx
 * // with bunny-thinker database
 * <HelixAIProviderSelector table={db.aiSettings} />
 *
 * // with custom database
 * <HelixAIProviderSelector table={myDb.aiSettings} settingsKey="user-123" />
 * ```
 */
export function HelixAIProviderSelector<T extends Table<HelixAISettings>>({
  table,
  settingsKey = "default",
  className,
}: HelixAIProviderSelectorProps<T>) {
  // Live query the current settings from the table
  const settings = useLiveQuery(
    () => table.get(settingsKey),
    [table, settingsKey],
  );

  const [isOpen, setIsOpen] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  // Determine available providers (exclude "default" which is a meta-provider)
  const providers = (Object.keys(HELIX_PROVIDER_LABELS) as HelixAIProvider[]).filter(
    (p) => p !== "default",
  );

  // Resolve the current provider (fallback to first provider if invalid)
  const resolvedProvider = settings?.provider ?? "";
  const currentProvider: HelixAIProvider = isHelixProvider(resolvedProvider)
    ? resolvedProvider
    : providers[0];

  // Get models for the selected provider using HELIX_AI_MODELS
  const modelsForProvider = HELIX_AI_MODELS[currentProvider] ?? [];

  // Resolve the current model (fallback to first model if invalid or missing)
  const resolvedModel = settings?.model ?? "";
  const currentModel = modelsForProvider.includes(resolvedModel)
    ? resolvedModel
    : modelsForProvider[0] ?? "";

  // Toggle provider dropdown
  const toggleProviderDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) setModelDropdownOpen(false);
  };

  // Toggle model dropdown
  const toggleModelDropdown = () => {
    setModelDropdownOpen(!modelDropdownOpen);
    if (!modelDropdownOpen) setIsOpen(false);
  };

  // Handle provider change
  const handleProviderChange = async (provider: HelixAIProvider) => {
    const models = HELIX_AI_MODELS[provider] ?? [];
    const newModel = models[0] ?? "";

    await table.put(
      { provider, model: newModel },
      settingsKey,
    );
    setIsOpen(false);
  };

  // Handle model change
  const handleModelChange = async (model: string) => {
    await table.put(
      { provider: currentProvider, model },
      settingsKey,
    );
    setModelDropdownOpen(false);
  };

  return (
    <div className={cn("flex flex-col gap-4 min-w-80", className)}>
      {/* Provider Select */}
      <div className="relative">
        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
          AI Provider
        </label>
        <button
          type="button"
          onClick={toggleProviderDropdown}
          className="flex w-full items-center justify-between gap-1.5 rounded-xl border border-input bg-input/30 px-3 py-2.5 text-sm whitespace-nowrap transition-colors outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 hover:bg-input/50"
        >
          <span className="flex items-center gap-2">
            {HELIX_PROVIDER_LABELS[currentProvider]}
          </span>
          <ChevronDownIcon className={cn("size-4 transition-transform", isOpen && "rotate-180")} />
        </button>

        {/* Provider Dropdown */}
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full rounded-xl border bg-popover p-1 shadow-lg shadow-black/5 ring-1 ring-foreground/10 animate-in fade-in-0 zoom-in-95">
            {providers.map((provider) => (
              <button
                key={provider}
                type="button"
                onClick={() => handleProviderChange(provider)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  provider === currentProvider
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-input/50",
                )}
              >
                <span>{HELIX_PROVIDER_LABELS[provider]}</span>
                {provider === currentProvider && (
                  <CheckIcon className="size-4 text-emerald-500" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Model Select */}
      <div className="relative">
        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
          Model
        </label>
        <button
          type="button"
          onClick={toggleModelDropdown}
          disabled={modelsForProvider.length === 0}
          className="flex w-full items-center justify-between gap-1.5 rounded-xl border border-input bg-input/30 px-3 py-2.5 text-sm whitespace-nowrap transition-colors outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 hover:bg-input/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="flex items-center gap-2 truncate">
            {currentModel || "Select a provider first"}
          </span>
          <ChevronDownIcon className={cn("size-4 transition-transform shrink-0", modelDropdownOpen && "rotate-180")} />
        </button>

        {/* Model Dropdown */}
        {modelDropdownOpen && modelsForProvider.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-xl border bg-popover p-1 shadow-lg shadow-black/5 ring-1 ring-foreground/10 animate-in fade-in-0 zoom-in-95 max-h-60 overflow-y-auto">
            {modelsForProvider.map((model) => (
              <button
                key={model}
                type="button"
                onClick={() => handleModelChange(model)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  model === currentModel
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-input/50",
                )}
              >
                <span className="truncate">{model}</span>
                {model === currentModel && (
                  <CheckIcon className="size-4 text-emerald-500 shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}