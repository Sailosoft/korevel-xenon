import { BUIAIProvider } from "../modules/ai/bui.ai.interface";

/** Predefined models per provider */
export const BUI_AI_MODELS: Record<BUIAIProvider, readonly string[]> = {
  default: [
    "gemma4:31b-cloud",
    "gemma4:31b",
    "llama3.2:8b",
    "llama3.2:3b",
    "llama3.2:1b",
    "mistral:7b",
    "qwen2.5:7b",
  ] as const,
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
