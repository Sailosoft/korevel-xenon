"use client";

// BDAISettings.Context — provides the global AI provider/model to every
// BunnyDev sub-module. Falls back to defaults until a row is persisted.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
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
  const [aiConfig, setAiConfig] = useState<BDAIOption>(BD_AI_SETTINGS_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const row = await bdDB.aiSettings.get(BD_AI_SETTINGS_KEY);
      if (row) {
        setAiConfig({ provider: row.provider, model: row.model });
      }
    } catch (err) {
      console.error("[BDAISettings] Failed to load settings:", err);
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (hasLoaded) return;
    // Async IndexedDB read — setState happens after `await`.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveAISettings = useCallback(async (ai: BDAIOption) => {
    await bdDB.aiSettings.put({
      key: BD_AI_SETTINGS_KEY,
      provider: ai.provider as HelixAIProvider,
      model: ai.model,
    });
    setAiConfig(ai);
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    await load();
  }, [load]);

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
