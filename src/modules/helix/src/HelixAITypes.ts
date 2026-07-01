/**
 * ───────────────────────────────────────────────────────────────────────────────
 * HelixAI Types — AI Provider Settings Schema
 * ───────────────────────────────────────────────────────────────────────────────
 */

import { HelixAIProvider } from "./HelixConfig";

/**
 * The settings shape persisted to Dexie.
 * Matches: this.table<HelixAISettings, string>("aiSettings");
 */
export interface HelixAISettings {
  /** The selected AI provider key */
  provider: HelixAIProvider;
  /** The selected model identifier for that provider */
  model: string;
}