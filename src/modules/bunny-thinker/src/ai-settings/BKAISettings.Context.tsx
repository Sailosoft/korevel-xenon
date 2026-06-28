/**
 * BKAISettings.Context — React context + hook for BunnyAI Thinker AI settings.
 *
 * Provides the user's saved AI provider+model preference to all child
 * components that call Helix-based server actions.  The hook reads from
 * IndexedDB on mount and exposes a save function so the settings page can
 * persist changes.
 */

"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { HelixAIOption } from "@/src/modules/helix";
import { bkThinkerDB } from "../database/BKThinkerDatabase";
import {
  BKAISettings,
  BK_AI_SETTINGS_DEFAULTS,
} from "./BKAISettings.Types";

// ─── Constants ────────────────────────────────────────────────────────────

/** Fixed ID for the singleton AI settings record. */
const SETTINGS_ID = "global";

// ─── Context type ─────────────────────────────────────────────────────────

export interface BKAISettingsContextValue {
  /** The currently active AI configuration */
  aiConfig: HelixAIOption;
  /** True while the initial load from IndexedDB is in progress */
  loading: boolean;
  /** Save updated settings to IndexedDB */
  saveSettings: (settings: BKAISettings) => Promise<void>;
  /** Reload settings from IndexedDB */
  reloadSettings: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────

const BKAISettingsContext = createContext<BKAISettingsContextValue | null>(
  null,
);

// ─── Provider ─────────────────────────────────────────────────────────────

export function BKAISettingsProvider({ children }: { children: ReactNode }) {
  const [aiConfig, setAiConfig] = useState<HelixAIOption>({
    provider: BK_AI_SETTINGS_DEFAULTS.provider,
    model: BK_AI_SETTINGS_DEFAULTS.model,
  });
  const [loading, setLoading] = useState(true);

  const loadFromDB = useCallback(async () => {
    try {
      const result = await bkThinkerDB.aiSettingsRepo.get(SETTINGS_ID);
      if (result.isSuccess) {
        const settings = result.value;
        setAiConfig({
          provider: settings.provider,
          model: settings.model,
        });
      } else {
        // No saved settings yet — use defaults (already set in state)
      }
    } catch (err) {
      console.error(
        "[BKAISettings] Failed to load settings from IndexedDB:",
        err,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFromDB();
  }, [loadFromDB]);

  const saveSettings = useCallback(async (settings: BKAISettings) => {
    try {
      await bkThinkerDB.aiSettingsRepo.create({
        id: SETTINGS_ID,
        ...settings,
      } as BKAISettings & { id: string });

      setAiConfig({
        provider: settings.provider,
        model: settings.model,
      });
    } catch (err) {
      console.error(
        "[BKAISettings] Failed to save settings to IndexedDB:",
        err,
      );
      throw err;
    }
  }, []);

  const reloadSettings = useCallback(async () => {
    setLoading(true);
    await loadFromDB();
  }, [loadFromDB]);

  return (
    <BKAISettingsContext.Provider
      value={{ aiConfig, loading, saveSettings, reloadSettings }}
    >
      {children}
    </BKAISettingsContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useAISettings(): BKAISettingsContextValue {
  const ctx = useContext(BKAISettingsContext);
  if (!ctx) {
    throw new Error(
      "useAISettings must be used within a <BKAISettingsProvider>",
    );
  }
  return ctx;
}
