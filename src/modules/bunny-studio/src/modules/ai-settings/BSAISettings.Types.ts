// BSAISettings.Types — AI configuration settings for Bunny AI Studio.
//
// Stores the user's preferred AI provider + model pair (global settings),
// which is passed as HelixAIOption to AI calls. Individual chats, agents,
// and inputs may override the global setting (least → most priority).

import type { HelixAIProvider } from "@/src/modules/helix";

/** Fixed ID for the singleton global AI settings record. */
export const BS_AI_SETTINGS_ID = "global";

/** The settings shape persisted in the aiSettings Dexie table. */
export interface BSAISettings {
  /** The selected AI provider key */
  provider: HelixAIProvider;
  /** The selected model identifier for that provider */
  model: string;
}

/** Default AI settings — used when nothing has been saved yet. */
export const BS_AI_SETTINGS_DEFAULTS: BSAISettings = {
  provider: "default",
  model: "gemma4:31b-cloud",
};
