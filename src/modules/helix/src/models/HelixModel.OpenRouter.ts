/**
 * ───────────────────────────────────────────────────────────────────────────────
 * Helix — Model Library: OpenRouter (provider key: "openRouter")
 * ───────────────────────────────────────────────────────────────────────────────
 * Selectable chat models for the "openRouter" provider. Referenced from
 * HelixConfig.ts via HELIX_PROVIDER_MODELS so this catalog stays in one place.
 */

export const OPEN_ROUTER_MODELS = [
  // new batch
  // google
  "google/gemma-4-26b-a4b-it:free",
  "google/gemma-4-31b-it:free",

  // inclusion
  "inclusionai/ling-3.0-flash-sante:free",
  "inclusionai/ling-3.0-flash-fin:free",

  // dots
  "dots-studio/dots-3-note-preview:free",

  // liquid
  "liquid/lfm-2.5-2.6b:free",

  // nvidia
  "nvidia/nemotron-3.5-lightning:free",
  "nvidia/nemotron-3.5-content-safety:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "nvidia/nemotron-3-super-120b-a12b:free",

  // thinking
  "thinkingmachines/inkling-small:free",
  "thinkingmachines/inkling:free",

  // poolside
  "poolside/laguna-s-2.1:free",
  "poolside/laguna-xs-2.1:free",

  // cohere
  "cohere/north-mini-code:free",
] as const;
