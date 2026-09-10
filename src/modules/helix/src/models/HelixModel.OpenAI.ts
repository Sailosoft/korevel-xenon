/**
 * ───────────────────────────────────────────────────────────────────────────────
 * Helix — Model Library: OpenAI (provider key: "openai")
 * ───────────────────────────────────────────────────────────────────────────────
 * Selectable chat models for the "openai" provider. Referenced from
 * HelixConfig.ts via HELIX_PROVIDER_MODELS so this catalog stays in one place.
 */

export const OPENAI_MODELS = [
  // Flagship & Frontier Models
  "gpt-5.6-sol",
  "gpt-5.6-terra",
  "gpt-5.6-luna",
  "gpt-5.4",
  "gpt-5.4-mini",
  "gpt-5.4-nano",
  "gpt-5",
  "gpt-5-mini",
  "gpt-5-nano",

  // Reasoning & Deep Intelligence (o-Series)
  "o3",
  "o3-pro",
  "o4-mini",
  "o1",
  "o1-mini",

  // Agentic & Coding-Specific
  "gpt-5.3-codex",

  // Multimodal & Legacy GPT-4 Series
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4.5-preview",
  "gpt-4-turbo",
  "gpt-3.5-turbo",

  // Open-Weights (Local/Self-Hosted API)
  "gpt-oss-120b",
  "gpt-oss-20b",
] as const;
