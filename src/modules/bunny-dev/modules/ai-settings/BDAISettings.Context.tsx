"use client";

// BDAISettings.Context — provides the global AI provider/model to every
// BunnyDev sub-module. Reads the `aiSettings` singleton reactively via
// `useLiveQuery` so selections made with HelixAIProviderSelector (which writes
// straight to IndexedDB) propagate to every generation panel immediately.
// Falls back to defaults until a row is persisted.

import {
  createContext,
  useCallback,
  useContext,
  type ReactNode,
} from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { HelixAIProvider } from "@/src/modules/helix";
import { bdDB } from "../../BDDatabase";
import {
  BD_AI_SETTINGS_DEFAULTS,
  BD_AI_SETTINGS_KEY,
  type BDAIOption,
} from "./BDAISettings.Types";

export interface BDAISettingsContextValue {
  aiConfig: BDAIOption;
  loading: boolean;
  saveAISettings: (ai: BDAIOption) => Promise<void>;
  reload: () => Promise<void>;
}

const BDAISettingsContext = createContext<BDAISettingsContextValue | null>(
  null,
);

export function BDAISettingsProvider({ children }: { children: ReactNode }) {
  // Reactive read — updates whenever the singleton row changes (including
  // writes from HelixAIProviderSelector elsewhere in the app).
  const row = useLiveQuery(
    () => bdDB.aiSettings.get(BD_AI_SETTINGS_KEY),
    [],
  );

  const aiConfig: BDAIOption = row
    ? { provider: row.provider, model: row.model }
    : BD_AI_SETTINGS_DEFAULTS;

  const loading = row === undefined;

  const saveAISettings = useCallback(async (ai: BDAIOption) => {
    await bdDB.aiSettings.put({
      key: BD_AI_SETTINGS_KEY,
      provider: ai.provider as HelixAIProvider,
      model: ai.model,
    });
  }, []);

  // Retained for API compatibility; `useLiveQuery` re-reads automatically.
  const reload = useCallback(() => Promise.resolve(), []);

  return (
    <BDAISettingsContext.Provider
      value={{ aiConfig, loading, saveAISettings, reload }}
    >
      {children}
    </BDAISettingsContext.Provider>
  );
}

export function useBDAISettings(): BDAISettingsContextValue {
  const ctx = useContext(BDAISettingsContext);
  if (!ctx) {
    throw new Error("useBDAISettings must be used within BDAISettingsProvider");
  }
  return ctx;
}
