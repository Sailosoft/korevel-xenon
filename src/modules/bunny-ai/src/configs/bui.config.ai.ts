import { BUIAIProvider } from "../modules/ai/bui.ai.interface";

// ── Provider-specific model lists ─────────────────────────────────────────────
// Add or remove models here per provider. The "default" key is auto-computed
// by merging all other providers — no manual duplication needed.

const PROVIDER_MODELS: Record<
  Exclude<BUIAIProvider, "default">,
  readonly string[]
> = {
  ollamaLocal: [
    "gemma4:31b",
    "llama3.2:8b",
    "llama3.2:3b",
    "llama3.2:1b",
    "mistral:7b",
    "qwen2.5:7b",
  ] as const,
  ollamaCloud: ["gemma4:31b-cloud"] as const,
  deepseek: [
    "deepseek-chat",
    "deepseek-reasoner",
    "deepseek-v4-flash",
    "deepseek-v4-pro",
  ] as const,
  groq: [
    "mixtral-8x7b-32768",
    "llama3-70b-8192",
    "llama3-8b-8192",
    "gemma2-9b-it",
  ] as const,
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"] as const,
  openRouter: [
    "mixtral-8x7b-32768",
    "llama3-70b-8192",
    "llama3-8b-8192",
    "gemma2-9b-it",
  ] as const,
};

// ── Default: auto-merge all provider models ────────────────────────────────────
// Dynamically aggregates every model from all other providers into one flat list.
// No need to manually copy models — just add them to PROVIDER_MODELS above.

export const BUI_AI_MODELS: Record<BUIAIProvider, readonly string[]> = {
  default: ["default", ...Object.values(PROVIDER_MODELS).flat()],
  ...PROVIDER_MODELS,
};
