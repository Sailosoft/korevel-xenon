/**
 * ───────────────────────────────────────────────────────────────────────────────
 * Helix — Model Library: Ollama Cloud (provider key: "ollamaCloud")
 * ───────────────────────────────────────────────────────────────────────────────
 * Selectable chat models for the "ollamaCloud" provider. Referenced from
 * HelixConfig.ts via HELIX_PROVIDER_MODELS so this catalog stays in one place.
 * The Ollama (local) catalog reuses these cloud models too, so they are kept
 * here as a single shared source.
 */

export const OLLAMA_CLOUD_MODELS: readonly string[] = [
  // Check model
  "gemma4:31b-cloud",
  "gpt-oss:20b-cloud",
  "gpt-oss:120b-cloud",
  "nemotron-3-super:cloud",
  "nemotron-3-nano:30b-cloud",
  "nemotron-3-ultra:cloud",
];
