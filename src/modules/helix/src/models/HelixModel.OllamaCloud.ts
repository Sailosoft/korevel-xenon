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
  "beam:cloud",
  "clef:cloud",
  "deepseek-v4-pro:cloud",
  "deepseek-v4.1-flash:cloud",
  "gemma4:cloud",
  "glm-5.2:cloud",
  "glm-5.3:cloud",
  "glm-5.3-flash:cloud",
  "gpt-oss:20b:cloud",
  "gpt-oss:120b:cloud",
  "kimi-k2.6:cloud",
  "kimi-k2.7-code:cloud",
  "kimi-k3:cloud",
  "kimi-k3.1-pro:cloud",
  "mimo-v2.6-flash:cloud",
  "mimo-v2.6-pro:cloud",
  "minimax-m3:cloud",
  "minimax-m3.1-flash:cloud",
  "mistral-large-4:cloud",
  "muse-spark-open:cloud",
  "nemotron-3-super:cloud",
  "nemotron-3-ultra:cloud",
];
