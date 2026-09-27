// BDAISettings.Types.ts — global AI settings for BunnyDev.
//
// Stored as a singleton row (key = "global") in the `aiSettings` table using
// Helix's persisted settings shape, so the shared HelixAIProviderSelector and
// useHelixAISettings hooks work without adaptation.

import type { HelixAIProvider, HelixAISettings } from "@/src/modules/helix";

/** Fixed primary key for the singleton global AI settings row. */
export const BD_AI_SETTINGS_KEY = "global";

export type BDAISettingsRow = HelixAISettings;

export interface BDAIOption {
  provider: HelixAIProvider;
  model: string;
}

export const BD_AI_SETTINGS_DEFAULTS: BDAIOption = {
  provider: "default",
  model: "gemma4:31b-cloud",
};
