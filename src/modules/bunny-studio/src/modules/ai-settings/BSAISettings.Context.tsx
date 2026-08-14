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
  BSAIImageSettings,
  BSSpeechSettings,
  BSTTSSettings,
  BSVideoSettings,
  BS_AI_SETTINGS_DEFAULTS,
  BS_AI_IMAGE_SETTINGS_DEFAULTS,
  BS_AI_VIDEO_SETTINGS_DEFAULTS,
  BS_AI_TTS_SETTINGS_DEFAULTS,
  BS_AI_SETTINGS_ID,
  BS_SPEECH_SETTINGS_DEFAULTS,
} from "./BSAISettings.Types";

// ─── Context type ─────────────────────────────────────────────────────────

export interface BSAISettingsContextValue {
  /** The currently active global AI configuration */
  aiConfig: HelixAIOption;
  /** The currently active speech-to-text settings */
  speech: BSSpeechSettings;
  /** The currently active image-generation AI settings */
  imageConfig: BSAIImageSettings;
  /** The currently active video-generation AI settings */
  videoConfig: BSVideoSettings;
  /** The currently active speech-generation (TTS) AI settings */
  ttsConfig: BSTTSSettings;
  /** True while the initial load from IndexedDB is in progress */
  loading: boolean;
  /** Save only the global AI provider + model (speech settings are preserved) */
  saveAISettings: (ai: HelixAIOption) => Promise<void>;
  /** Save only the speech-to-text settings (AI provider + model are preserved) */
  saveSpeechSettings: (speech: BSSpeechSettings) => Promise<void>;
  /** Save only the image-generation settings (AI + STT settings are preserved) */
  saveImageSettings: (image: BSAIImageSettings) => Promise<void>;
  /** Save only the video-generation settings (AI + image + STT are preserved) */
  saveVideoSettings: (video: BSVideoSettings) => Promise<void>;
  /** Save only the speech-generation (TTS) settings (AI + image + video + STT are preserved) */
  saveTTSSettings: (tts: BSTTSSettings) => Promise<void>;
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
  const [speech, setSpeech] = useState<BSSpeechSettings>(
    BS_SPEECH_SETTINGS_DEFAULTS,
  );
  const [imageConfig, setImageConfig] = useState<BSAIImageSettings>(
    BS_AI_IMAGE_SETTINGS_DEFAULTS,
  );
  const [videoConfig, setVideoConfig] = useState<BSVideoSettings>(
    BS_AI_VIDEO_SETTINGS_DEFAULTS,
  );
  const [ttsConfig, setTTSConfig] = useState<BSTTSSettings>(
    BS_AI_TTS_SETTINGS_DEFAULTS,
  );
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
        setSpeech({
          ...BS_SPEECH_SETTINGS_DEFAULTS,
          ...settings.speech,
        });
        setImageConfig({
          ...BS_AI_IMAGE_SETTINGS_DEFAULTS,
          ...settings.image,
        });
        setVideoConfig({
          ...BS_AI_VIDEO_SETTINGS_DEFAULTS,
          ...settings.video,
        });
        setTTSConfig({
          ...BS_AI_TTS_SETTINGS_DEFAULTS,
          ...settings.tts,
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

  // Persist a partial update to the single settings record, merging with what is
  // already stored so saving AI config alone doesn't clobber speech settings
  // (and vice versa) since they are edited on separate pages.
  const persistSettings = useCallback(async (patch: Partial<BSAISettings>) => {
    try {
      const existing = await bsDB.aiSettingsRepo.get(BS_AI_SETTINGS_ID);
      let merged: BSAISettings;
      if (existing.isSuccess) {
        merged = { ...existing.value, ...patch };
        await bsDB.aiSettingsRepo.update(BS_AI_SETTINGS_ID, merged);
      } else {
        merged = { ...BS_AI_SETTINGS_DEFAULTS, ...patch };
        await bsDB.aiSettingsRepo.create({
          id: BS_AI_SETTINGS_ID,
          ...merged,
        } as BSAISettings & { id: string });
      }
      setAiConfig({ provider: merged.provider, model: merged.model });
      setSpeech({ ...BS_SPEECH_SETTINGS_DEFAULTS, ...merged.speech });
      setImageConfig({
        ...BS_AI_IMAGE_SETTINGS_DEFAULTS,
        ...merged.image,
      });
      setVideoConfig({
        ...BS_AI_VIDEO_SETTINGS_DEFAULTS,
        ...merged.video,
      });
      setTTSConfig({
        ...BS_AI_TTS_SETTINGS_DEFAULTS,
        ...merged.tts,
      });
    } catch (err) {
      console.error("[BSAISettings] Failed to save settings to IndexedDB:", err);
      throw err;
    }
  }, []);

  const saveAISettings = useCallback(
    async (ai: HelixAIOption) => {
      await persistSettings({ provider: ai.provider, model: ai.model });
    },
    [persistSettings],
  );

  const saveSpeechSettings = useCallback(
    async (speech: BSSpeechSettings) => {
      await persistSettings({ speech });
    },
    [persistSettings],
  );

  const saveImageSettings = useCallback(
    async (image: BSAIImageSettings) => {
      await persistSettings({ image });
    },
    [persistSettings],
  );

  const saveVideoSettings = useCallback(
    async (video: BSVideoSettings) => {
      await persistSettings({ video });
    },
    [persistSettings],
  );

  const saveTTSSettings = useCallback(
    async (tts: BSTTSSettings) => {
      await persistSettings({ tts });
    },
    [persistSettings],
  );

  const reloadSettings = useCallback(async () => {
    setLoading(true);
    await loadFromDB();
  }, [loadFromDB]);

  return (
    <BSAISettingsContext.Provider
      value={{
        aiConfig,
        speech,
        imageConfig,
        videoConfig,
        ttsConfig,
        loading,
        saveAISettings,
        saveSpeechSettings,
        saveImageSettings,
        saveVideoSettings,
        saveTTSSettings,
        reloadSettings,
      }}
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
