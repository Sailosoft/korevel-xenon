/**
 * BSAISettings.Context — React context + hook for Bunny AI Studio AI settings.
 *
 * Provides the user's saved AI provider+model preference to all child
 * components. The hook reads from IndexedDB on mount and exposes a save
 * function so the settings page can persist changes.
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
import { bsDB } from "../../BSDatabase";
import {
  BSAISettings,
  BS_AI_SETTINGS_DEFAULTS,
  BS_AI_SETTINGS_ID,
} from "./BSAISettings.Types";

// ─── Context type ─────────────────────────────────────────────────────────

export interface BSAISettingsContextValue {
  /** The currently active global AI configuration */
  aiConfig: HelixAIOption;
  /** True while the initial load from IndexedDB is in progress */
  loading: boolean;
  /** Save updated settings to IndexedDB */
  saveSettings: (settings: BSAISettings) => Promise<void>;
  /** Reload settings from IndexedDB */
  reloadSettings: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────

const BSAISettingsContext = createContext<BSAISettingsContextValue | null>(
  null,
);

// ─── Provider ─────────────────────────────────────────────────────────────

export function BSAISettingsProvider({ children }: { children: ReactNode }) {
  const [aiConfig, setAiConfig] = useState<HelixAIOption>({
    provider: BS_AI_SETTINGS_DEFAULTS.provider,
    model: BS_AI_SETTINGS_DEFAULTS.model,
  });
  const [loading, setLoading] = useState(true);
  // Track whether the initial load has completed to avoid re-running setState
  // synchronously within the effect body.
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadFromDB = useCallback(async () => {
    try {
      const result = await bsDB.aiSettingsRepo.get(BS_AI_SETTINGS_ID);
      if (result.isSuccess) {
        const settings = result.value;
        setAiConfig({
          provider: settings.provider,
          model: settings.model,
        });
      }
    } catch (err) {
      console.error("[BSAISettings] Failed to load settings from IndexedDB:", err);
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (hasLoaded) return;
    // Async IndexedDB fetch — setState happens after `await`, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadFromDB();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveSettings = useCallback(async (settings: BSAISettings) => {
    try {
      const existing = await bsDB.aiSettingsRepo.get(BS_AI_SETTINGS_ID);
      if (existing.isSuccess) {
        await bsDB.aiSettingsRepo.update(BS_AI_SETTINGS_ID, settings);
      } else {
        await bsDB.aiSettingsRepo.create({
          id: BS_AI_SETTINGS_ID,
          ...settings,
        } as BSAISettings & { id: string });
      }
      setAiConfig({
        provider: settings.provider,
        model: settings.model,
      });
    } catch (err) {
      console.error("[BSAISettings] Failed to save settings to IndexedDB:", err);
      throw err;
    }
  }, []);

  const reloadSettings = useCallback(async () => {
    setLoading(true);
    await loadFromDB();
  }, [loadFromDB]);

  return (
    <BSAISettingsContext.Provider
      value={{ aiConfig, loading, saveSettings, reloadSettings }}
    >
      {children}
    </BSAISettingsContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useBSAISettings(): BSAISettingsContextValue {
  const ctx = useContext(BSAISettingsContext);
  if (!ctx) {
    throw new Error("useBSAISettings must be used within BSAISettingsProvider");
  }
  return ctx;
}
