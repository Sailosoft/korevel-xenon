/**
 * ───────────────────────────────────────────────────────────────────────────────
 * HelixAI Types — AI Provider Settings Schema
 * ───────────────────────────────────────────────────────────────────────────────
 */

import { HelixAIProvider } from "./HelixConfig";

/**
 * The settings shape persisted to Dexie.
 * Matches: this.table<HelixAISettings, string>("aiSettings");
 * Schema: "key, provider, model"
 */
export interface HelixAISettings {
  /** Primary key — matches the settingsKey passed to HelixAIProviderSelector */
  key?: string;
  /** The selected AI provider key */
  provider: HelixAIProvider;
  /** The selected model identifier for that provider */
  model: string;
}