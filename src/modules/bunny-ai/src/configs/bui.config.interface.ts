/**
 * ───────────────────────────────────────────────────────────────────────────────
 * AI Provider & Configuration Types — Single source of truth
 * ───────────────────────────────────────────────────────────────────────────────
 * Everything related to AI provider identity, options, and config shapes lives
 * here.  Service interfaces (BUIAIServiceType etc.) stay in the ai/ module.
 */

// ── Provider identity ─────────────────────────────────────────────────────────

export type BUIAIProvider =
  | "default"
  | "ollamaLocal"
  | "ollamaCloud"
  | "deepseek"
  | "groq"
  | "openai"
  | "deepinfra"
  | "openRouter"
  | "googleAIStudio";

// ── Temperature presets ───────────────────────────────────────────────────────

/**
 * Precise: 0.2
 * Balanced: 0.75
 * Creative: 1.0
 * Exploratory: 2.0
 */
export type BUITemperaturePreset =
  | "precise"
  | "balanced"
  | "creative"
  | "exploratory";

// ── Provider DTOs ─────────────────────────────────────────────────────────────

/** Override DTO to swap the default provider+model at call-site */
export interface BUIAIOption {
  provider: BUIAIProvider;
  model: string;
}

/** Configuration for a single AI provider (API key, endpoint, model) */
export interface BUIAIProviderConfig {
  provider: BUIAIProvider;
  apiKey: string;
  /** The model identifier — must be one of the predefined models for this provider */
  model: string;
  /** Custom base URL override (required for ollama-local) */
  endpoint?: string;
}

// ── Top-level config shapes ───────────────────────────────────────────────────

export interface BUIConfigAI {
  /** All configured providers */
  providers: BUIAIProviderConfig[];
  /** The currently active provider key */
  activeProvider: BUIAIProvider;
}

export interface BUIConfig {
  ai: BUIConfigAI;
}
