/**
 * ───────────────────────────────────────────────────────────────────────────────
 * useHelixAIImageSettings — Hook for Helix Image AI Settings Management
 * ───────────────────────────────────────────────────────────────────────────────
 * Pairs with HelixAIImageProviderSelector for programmatic access to
 * image-generation AI settings. Provider identity/config is reused from
 * HelixConfig; the image model collection comes from HelixConfig.Image.
 */

import { Table } from "dexie";
import { useLiveQuery } from "dexie-react-hooks";
import { useCallback } from "react";

import { HelixAIProvider } from "../HelixConfig";
import {
  HELIX_PROVIDER_IMAGE_MODELS,
  HELIX_IMAGE_MODELS,
} from "../HelixConfig.Image";
import { HelixAISettings } from "../HelixAITypes";

/**
 * Arguments for useHelixAIImageSettings
 */
export interface UseHelixAIImageSettingsOptions {
  /** The Dexie table to read/write settings */
  table: Table<HelixAISettings>;
  /** Primary key value (default: "default") */
  key?: string;
}

/**
 * Return type for useHelixAIImageSettings
 */
export interface UseHelixAIImageSettingsReturn {
  /** The current settings (undefined if not found) */
  settings: HelixAISettings | undefined;
  /** Loading state */
  isLoading: boolean;
  /** Update the provider (auto-selects first available image model) */
  setProvider: (provider: HelixAIProvider) => Promise<void>;
  /** Update the model */
  setModel: (model: string) => Promise<void>;
  /** Update both provider and model at once */
  setSettings: (settings: HelixAISettings) => Promise<void>;
  /** Reset to the first image-capable provider with its first available model */
  reset: () => Promise<void>;
}

/**
 * useHelixAIImageSettings
 *
 * React hook for reading and mutating Helix image-generation AI settings from
 * any Dexie table. Works alongside HelixAIImageProviderSelector for
 * programmatic control.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { settings, setProvider, setModel } = useHelixAIImageSettings({
 *     table: db.aiSettings,
 *     key: "image-default",
 *   });
 *
 *   if (!settings) return <Loading />;
 *
 *   return (
 *     <div>
 *       <p>Current: {settings.provider} / {settings.model}</p>
 *       <button onClick={() => setProvider("siliconFlow")}>Use SiliconFlow</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useHelixAIImageSettings<
  T extends Table<HelixAISettings>,
>({
  table,
  key = "default",
}: UseHelixAIImageSettingsOptions): UseHelixAIImageSettingsReturn {
  // Reactively watch the settings
  const settings = useLiveQuery(
    () => table.get(key),
    [table, key],
  );

  const isLoading = settings === undefined;

  // Update provider (auto-resets model to first available image model)
  const setProvider = useCallback(
    async (provider: HelixAIProvider) => {
      const model = HELIX_IMAGE_MODELS[provider]?.[0] ?? "";
      await table.put({ provider, model }, key);
    },
    [table, key],
  );

  // Update model
  const setModel = useCallback(
    async (model: string) => {
      if (!settings) return;
      await table.put({ ...settings, model }, key);
    },
    [table, key, settings],
  );

  // Update both at once
  const setSettings = useCallback(
    async (newSettings: HelixAISettings) => {
      await table.put(newSettings, key);
    },
    [table, key],
  );

  // Reset to the first image-capable provider + its first model
  const reset = useCallback(async () => {
    const providers = (
      Object.keys(HELIX_PROVIDER_IMAGE_MODELS) as HelixAIProvider[]
    ).filter((p) => p !== "default");
    const provider = providers[0] ?? "siliconFlow";
    const model = HELIX_IMAGE_MODELS[provider]?.[0] ?? "";
    await table.put({ provider, model }, key);
  }, [table, key]);

  return {
    settings,
    isLoading,
    setProvider,
    setModel,
    setSettings,
    reset,
  };
}

/**
 * useHelixAIImageOption
 *
 * Returns just the HelixAIOption shape (compatible with HelixAIService calls).
 * Convenience hook when you only need the provider+model tuple for image
 * generation.
 *
 * @example
 * ```tsx
 * const option = useHelixAIImageOption({ table: db.aiSettings });
 * const response = await helixService.chat({ ...option, messages: [] });
 * ```
 */
export function useHelixAIImageOption<
  T extends Table<HelixAISettings>,
>(
  options: UseHelixAIImageSettingsOptions,
): { provider: HelixAIProvider; model: string } | undefined {
  const { settings } = useHelixAIImageSettings(options);
  if (!settings) return undefined;
  return { provider: settings.provider, model: settings.model };
}
