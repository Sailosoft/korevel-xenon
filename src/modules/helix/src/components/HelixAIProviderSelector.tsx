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
import { CheckIcon } from "lucide-react";
import { Key } from "react";
import { Select, Label, ListBox } from "@heroui/react";

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

    // Handle provider change
  const handleProviderChange = async (provider: Key | null) => {
    if (provider === null) return;
    const providerKey = provider.toString() as HelixAIProvider;
    const models = HELIX_AI_MODELS[providerKey] ?? [];
    const newModel = models[0] ?? "";

    // Include key in the object to match Dexie schema keyPath "key"
    await table.put({
      key: settingsKey,
      provider: providerKey,
      model: newModel,
    });
  };

  // Handle model change
  const handleModelChange = async (model: Key | null) => {
    if (model === null) return;
    // Include key in the object to match Dexie schema keyPath "key"
    await table.put({
      key: settingsKey,
      provider: currentProvider,
      model: model.toString(),
    });
  };

    return (
    <div className={cn("flex flex-col gap-4 min-w-80", className)}>
      <Select value={currentProvider} onChange={handleProviderChange}>
        <Label className="text-sm font-medium text-muted-foreground mb-1.5 block">
          AI Provider
        </Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {providers.map((provider) => (
              <ListBox.Item key={provider} id={provider} textValue={HELIX_PROVIDER_LABELS[provider]}>
                {HELIX_PROVIDER_LABELS[provider]}
                <ListBox.ItemIndicator>
                  <CheckIcon className="size-4" />
                </ListBox.ItemIndicator>
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      <Select
        value={currentModel}
        onChange={handleModelChange}
        isDisabled={modelsForProvider.length === 0}
      >
        <Label className="text-sm font-medium text-muted-foreground mb-1.5 block">
          Model
        </Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {modelsForProvider.map((model) => (
              <ListBox.Item key={model} id={model} textValue={model}>
                {model}
                <ListBox.ItemIndicator>
                  <CheckIcon className="size-4" />
                </ListBox.ItemIndicator>
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  );
}