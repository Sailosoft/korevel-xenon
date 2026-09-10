/**
 * ───────────────────────────────────────────────────────────────────────────────
 * Helix — Model Library: Groq (provider key: "groq")
 * ───────────────────────────────────────────────────────────────────────────────
 * Selectable chat models for the "groq" provider. Referenced from
 * HelixConfig.ts via HELIX_PROVIDER_MODELS so this catalog stays in one place.
 */

export const GROQ_MODELS = [
  // Alibaba Cloud
  "qwen/qwen3-32b",

  // Canopy Labs
  "canopylabs/orpheus-arabic-saudi",
  "canopylabs/orpheus-v1-english",

  // Groq
  "groq/compound",
  "groq/compound-mini",
  "mixtral-8x7b-32768",
  "llama3-70b-8192",
  "llama3-8b-8192",
  "gemma2-9b-it",

  // Meta
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-prompt-guard-2-22m",
  "meta-llama/llama-prompt-guard-2-86m",

  // OpenAI
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "openai/gpt-oss-safeguard-20b",
  "whisper-large-v3",
  "whisper-large-v3-turbo",
] as const;
