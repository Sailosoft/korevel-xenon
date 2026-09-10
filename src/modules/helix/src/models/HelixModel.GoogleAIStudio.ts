/**
 * ───────────────────────────────────────────────────────────────────────────────
 * Helix — Model Library: Google AI Studio (provider key: "googleAIStudio")
 * ───────────────────────────────────────────────────────────────────────────────
 * Selectable chat models for the "googleAIStudio" provider. Referenced from
 * HelixConfig.ts via HELIX_PROVIDER_MODELS so this catalog stays in one place.
 */

export const GOOGLE_AI_STUDIO_MODELS = [
  // free
  "gemma-4-26b-a4b-it",
  "gemma-4-31b-it",

  // Gemini 2.5 Generation (Current Flagships)
  "gemini-2.5-pro",
  "gemini-2.5-flash",

  // Gemini 2.0 Generation
  "gemini-2.0-pro-exp-02-05",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite-preview-02-05",

  // Experimental / Specialized Reasoning Models
  "gemini-2.0-flash-thinking-exp-01-21",
  "learnlm-1.5-pro-experimental",

  // Legacy 1.5 Stable Generation
  "gemini-1.5-pro",
  "gemini-1.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-3.7-flash", // 0.375/1.875
] as const;
