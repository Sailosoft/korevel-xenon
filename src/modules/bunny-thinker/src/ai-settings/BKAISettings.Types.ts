/**
 * BKAISettings.Types — AI configuration settings for BunnyAI Thinker.
 *
 * Stores the user's preferred AI provider + model pair, which is then
 * passed as `HelixAIOption` to all server actions that call HelixAIService.
 */

import type { HelixAIProvider } from "@/src/modules/helix";

/**
 * Singleton settings document stored in IndexedDB.
 * A single record (key = "global") holds the user's active AI config.
 */
export interface BKAISettings {
  /** The selected AI provider key */
  provider: HelixAIProvider;
  /** The selected model identifier for that provider */
  model: string;
}

/** Default AI settings — used when nothing has been saved yet. */
export const BK_AI_SETTINGS_DEFAULTS: BKAISettings = {
  provider: "default",
  model: "gemma4:31b-cloud",
};
