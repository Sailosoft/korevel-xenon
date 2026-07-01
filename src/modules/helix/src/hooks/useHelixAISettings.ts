/**
 * ───────────────────────────────────────────────────────────────────────────────
 * useHelixAISettings — Hook for Helix AI Settings Management
 * ───────────────────────────────────────────────────────────────────────────────
 * Pairs with HelixAIProviderSelector for programmatic access to AI settings.
 */

import { Table } from "dexie";
import { useLiveQuery } from "dexie-react-hooks";
import { useCallback } from "react";

import { HelixAIProvider } from "../HelixConfig";
import { HelixAISettings } from "../HelixAITypes";

/**
 * Arguments for useHelixAISettings
 */
export interface UseHelixAISettingsOptions {
  /** The Dexie table to read/write settings */
  table: Table<HelixAISettings>;
  /** Primary key value (default: "default") */
  key?: string;
}

/**
 * Return type for useHelixAISettings
 */
export interface UseHelixAISettingsReturn {
  /** The current settings (null if not found) */
  settings: HelixAISettings | undefined;
  /** Loading state */
  isLoading: boolean;
  /** Update the provider (auto-selects first model) */
  setProvider: (provider: HelixAIProvider) => Promise<void>;
  /** Update the model */
  setModel: (model: string) => Promise<void>;
  /** Update both provider and model at once */
  setSettings: (settings: HelixAISettings) => Promise<void>;
  /** Reset to default provider with its first available model */
  reset: () => Promise<void>;
}

/**
 * useHelixAISettings
 *
 * React hook for reading and mutating Helix AI settings from any Dexie table.
 * Works alongside HelixAIProviderSelector for programmatic control.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { settings, setProvider, setModel } = useHelixAISettings({
 *     table: db.aiSettings,
 *     key: "default",
 *   });
 *
 *   if (!settings) return <Loading />;
 *
 *   return (
 *     <div>
 *       <p>Current: {settings.provider} / {settings.model}</p>
 *       <button onClick={() => setProvider("openai")}>Use OpenAI</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useHelixAISettings<T extends Table<HelixAISettings>>({
  table,
  key = "default",
}: UseHelixAISettingsOptions): UseHelixAISettingsReturn {
  // Reactively watch the settings
  const settings = useLiveQuery(
    () => table.get(key),
    [table, key],
  );

  const isLoading = settings === undefined;

  // Update provider (auto-resets model to first available one)
  const setProvider = useCallback(
    async (provider: HelixAIProvider) => {
      await table.put({ provider, model: "" }, key);
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

  // Reset to defaults (ollamaLocal + first model)
  const reset = useCallback(async () => {
    await table.put({ provider: "ollamaLocal", model: "gemma4:31b" }, key);
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
 * useHelixAIOption
 *
 * Returns just the HelixAIOption shape (compatible with HelixAIService calls).
 * Convenience hook when you only need the provider+model tuple.
 *
 * @example
 * ```tsx
 * const option = useHelixAIOption({ table: db.aiSettings });
 * const response = await helixService.chat({ ...option, messages: [] });
 * ```
 */
export function useHelixAIOption<T extends Table<HelixAISettings>>(
  options: UseHelixAISettingsOptions,
): { provider: HelixAIProvider; model: string } | undefined {
  const { settings } = useHelixAISettings(options);
  if (!settings) return undefined;
  return { provider: settings.provider, model: settings.model };
}