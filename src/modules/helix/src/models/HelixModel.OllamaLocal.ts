/**
 * ───────────────────────────────────────────────────────────────────────────────
 * Helix — Model Library: Ollama Local (provider key: "ollamaLocal")
 * ───────────────────────────────────────────────────────────────────────────────
 * Selectable chat models for the "ollamaLocal" provider. Referenced from
 * HelixConfig.ts via HELIX_PROVIDER_MODELS so this catalog stays in one place.
 * Local weights first, then the shared Ollama Cloud catalog (for local models
 * mirrored on the cloud).
 */

import { OLLAMA_CLOUD_MODELS } from "./HelixModel.OllamaCloud";

export const OLLAMA_LOCAL_MODELS = [
  "gemma3:1b",
  "gemma4:31b",
  "llama3.2:8b",
  "llama3.2:3b",
  "llama3.2:1b",
  "mistral:7b",
  "qwen2.5:7b",
  ...OLLAMA_CLOUD_MODELS,
] as const;
