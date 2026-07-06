/**
 * ───────────────────────────────────────────────────────────────────────────────
 * Helix — AI Provider & Configuration Types — Single source of truth
 * ───────────────────────────────────────────────────────────────────────────────
 * All AI provider identity, options, config shapes, provider data, and model
 * lists live here.  Consumers (BunnyAI, book-builder, etc.) subscribe to
 * Helix for their AI configuration needs rather than defining their own.
 */

// ── Provider identity ─────────────────────────────────────────────────────────

export type HelixAIProvider =
  | "default"
  | "ollamaLocal"
  | "ollamaCloud"
  | "deepseek"
  | "groq"
  | "openai"
  | "deepinfra"
  | "openRouter"
  | "requesty"
  | "googleAIStudio";

// ── Temperature presets ───────────────────────────────────────────────────────

/**
 * Precise: 0.2
 * Balanced: 0.75
 * Creative: 1.0
 * Exploratory: 2.0
 */
export type HelixTemperaturePreset =
  | "precise"
  | "balanced"
  | "creative"
  | "exploratory";

// ── Provider DTOs ─────────────────────────────────────────────────────────────

/** Override DTO to swap the default provider+model at call-site */
export interface HelixAIOption {
  provider: HelixAIProvider;
  model: string;
}

/** Configuration for a single AI provider (API key, endpoint, model) */
export interface HelixAIProviderConfig {
  provider: HelixAIProvider;
  apiKey: string;
  /** The model identifier — must be one of the predefined models for this provider */
  model: string;
  /** Custom base URL override (required for ollama-local) */
  endpoint?: string;
}

// ── Top-level config shapes ───────────────────────────────────────────────────

export interface HelixAIConfig {
  /** All configured providers */
  providers: HelixAIProviderConfig[];
  /** The currently active provider key */
  activeProvider: HelixAIProvider;
}

export interface HelixConfig {
  ai: HelixAIConfig;
}

// ── Provider configurations ──────────────────────────────────────────────────

export const HELIX_AI_PROVIDERS: HelixAIProviderConfig[] = [
  {
    provider: "default",
    apiKey: process.env.OPEN_AI_API_KEY || "[ENCRYPTION_KEY]",
    model: process.env.OPEN_AI_MODEL || "gemma4:31b-cloud",
    endpoint: process.env.OPEN_AI_BASE_URL || "http://localhost:11434/v1",
  },
  {
    provider: "ollamaLocal",
    apiKey: "ollama",
    model: process.env.OPEN_AI_MODEL || "gemma4:31b",
    endpoint: "http://localhost:11434/v1",
  },
  {
    provider: "ollamaCloud",
    apiKey: process.env.OLLAMA_API_KEY || "",
    model: "gemma4:31b-cloud",
    endpoint: "https://ollama.com/v1",
  },
  {
    provider: "deepseek",
    apiKey: process.env.DEEPSEEK_API_KEY || "",
    model: "deepseek-v4-pro",
    endpoint: "https://api.deepseek.com/v1",
  },
  {
    provider: "groq",
    apiKey: process.env.GROQ_API_KEY || "",
    model: "openai/gpt-oss-120b",
    endpoint: "https://api.groq.com/openai/v1",
  },
  {
    provider: "openai",
    apiKey: process.env.OPEN_AI_API_KEY || "",
    model: process.env.OPEN_AI_MODEL || "gpt-4o-mini",
    endpoint: "https://api.openai.com/v1",
  },
  {
    provider: "openRouter",
    apiKey: process.env.OPEN_ROUTER_API_KEY || "",
    model: "openrouter/free",
    endpoint: "https://openrouter.ai/api/v1",
  },
  {
    provider: "requesty",
    apiKey: process.env.REQUESTY_AI_API_KEY || "",
    model: "google/gemma-4-31b-it",
    endpoint: "https://router.requesty.ai/v1",
  },
  {
    provider: "deepinfra",
    apiKey: process.env.DEEP_INFRA_API_KEY || "",
    model: "google/gemma-4-31B-it",
    endpoint: "https://api.deepinfra.com/v1",
  },
  {
    provider: "googleAIStudio",
    apiKey: process.env.GOOGLE_AI_STUDIO_API_KEY || "",
    model: "gemini-3.1-flash-lite",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/openai",
  },
];

// ── Human-readable labels for each provider ───────────────────────────────────

export const HELIX_PROVIDER_LABELS: Record<HelixAIProvider, string> = {
  default: "Default (OpenAI-compatible)",
  ollamaLocal: "Ollama (Local)",
  ollamaCloud: "Ollama Cloud",
  deepseek: "DeepSeek",
  groq: "Groq",
  openai: "OpenAI",
  openRouter: "OpenRouter",
  requesty: "Requesty",
  deepinfra: "DeepInfra",
  googleAIStudio: "Google AI Studio",
};

// ── Type guard ────────────────────────────────────────────────────────────────

/** Checks whether an arbitrary string is a known HelixAIProvider */
export function isHelixProvider(value: string): value is HelixAIProvider {
  return (Object.keys(HELIX_PROVIDER_MODELS) as HelixAIProvider[]).includes(
    value as HelixAIProvider,
  );
}

// ── Provider-specific model lists ─────────────────────────────────────────────
// Add or remove models here per provider. The "default" key is auto-computed
// by merging all other providers — no manual duplication needed.

const HELIX_PROVIDER_MODELS: Record<
  Exclude<HelixAIProvider, "default">,
  readonly string[]
> = {
  googleAIStudio: [
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

    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-3-flash-preview",
  ] as const,
  deepinfra: [
    "google/gemma-4-31B-it",
    "deepseek-ai/DeepSeek-V4-Flash",
    "deepseek-ai/DeepSeek-V4-Pro",
    "nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B",
    "nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning",
    "moonshotai/Kimi-K2.6",
    "moonshotai/Kimi-K2.7-Code",
    "XiaomiMiMo/MiMo-V2.5",
    "XiaomiMiMo/MiMo-V2.5-Pro",
    "MiniMaxAI/MiniMax-M2.5",
    "Qwen/Qwen3-32B",
    "Qwen/Qwen3-Coder-480B-A35B-Instruct-Turbo",
    "anthropic/claude-opus-4-8",
    "google/gemini-3.5-flash",
    "google/gemini-3.1-pro",
    "google/gemini-3.1-flash-lite",
    "microsoft/phi-4",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-120b-Turbo",
    "openai/gpt-oss-20b",
    "stepfun-ai/Step-3.7-Flash",
    "zai-org/GLM-4.6",
    "zai-org/GLM-4.7",
    "zai-org/GLM-5.1",
    "zai-org/GLM-5.2",
    "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
    "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    "meta-llama/Llama-4-Scout-17B-16E-Instruct",
    "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
  ],
  ollamaLocal: [
    "gemma4:31b",
    "llama3.2:8b",
    "llama3.2:3b",
    "llama3.2:1b",
    "mistral:7b",
    "qwen2.5:7b",
    "gemma4:31b-cloud",
    "gemini-3-flash-preview:cloud",
    "deepseek-v4-pro:cloud",
    "deepseek-v4-flash:cloud",
    "devstral-small-2:24b-cloud",
    "devstral-2:123b-cloud"
  ] as const,
  ollamaCloud: [
    "gemma4:31b-cloud",
    "gemini-3-flash-preview:cloud",
    "deepseek-v4-pro:cloud",
    "deepseek-v4-flash:cloud",
    "devstral-small-2:24b-cloud",
    "devstral-2:123b-cloud",
  ] as const,
  deepseek: [
    "deepseek-chat",
    "deepseek-reasoner",
    "deepseek-v4-flash",
    "deepseek-v4-pro",
  ] as const,
  groq: [
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
  ] as const,
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"] as const,
  requesty: [
    // free
    "google/gemma-4-31b-it",
    "poolside/laguna-m.1",
    "poolside/laguna-xs.2",
    "nvidia/nemotron-3.5-content-safety",
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
    "nvidia/nemotron-3-nano-30b-a3b",
    "nvidia/nemotron-3-super-120b-a12b",
    "nvidia/nemotron-3-ultra-550b-a55b",
    // non free 1m token
    "xiaomi/mimo-v2.5",
    "xai/grok-4-1-fast-reasoning",
    "xai/grok-4-fast",
    "minimaxi/minimax-m3",
    "alibaba/qwen3.7-plus",
    "openai/gpt-4.1-mini",
    "vertex/gemini-3.1-flash-lite",
    "coding/gemini-2.5-flash",
    "google/gemini-2.5-flash",
    "xai/grok-4.3",
    "doubleword/glm-5.2:flex",
    "zai/glm-5.2",
    "alibaba/qwen3.7-max",
    "openai/gpt-5.4",
    "bedrock/claude-sonnet-4-6",
    "vertex/claude-opus-4-7",
    "openai/gpt-5.5",
    // low out price
    "groq/openai/gpt-oss-120b",
    "fireworks/gpt-oss-20b",
    "openai-responses/gpt-5-nano",
    "xai/grok-4-fast",
    // analytics good
    "novita/minimax/minimax-m2.7",
    "xai/grok-3-mini",
    "nebius/qwen/qwen3-235b-a22b-instruct-2507",
    "nebius/qwen/qwen3-30b-a3b-instruct-2507",
    "vertex/claude-4-5-sonnet",
    "openai/gpt-4.1-mini",
    "openai/gpt-5-mini",
    "openai/gpt-4.1-nano",
    "perplexity/sonar",
    "openai-responses/gpt-5.4-mini",
    "anthropic/claude-opus-4-8",
    "vertex/gemini-3.1-flash-lite@eu",
    "xiaomi/mimo-v2.5-pro"
  ] as const,
  openRouter: [
    "openrouter/fusion",
    "moonshotai/kimi-k2.7-code",
    "openrouter/free",
    "openrouter/bodybuilder",
    "openrouter/auto",
    "nex-agi/nex-n2-pro:free",
    "nvidia/nemotron-3.5-content-safety:free",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "openrouter/owl-alpha",
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    "poolside/laguna-xs.2:free",
    "poolside/laguna-m.1:free",
    "google/gemma-4-26b-a4b-it:free",
    "google/gemma-4-31b-it:free",
    "google/lyria-3-pro-preview",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "liquid/lfm-2.5-1.2b-thinking:free",
    "liquid/lfm-2.5-1.2b-instruct:free",
    "nvidia/nemotron-nano-12b-v2-vl:free",
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "nvidia/nemotron-nano-9b-v2:free",
    "openai/gpt-oss-120b:free",
    "qwen/qwen3-coder:free",
    "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "meta-llama/llama-3.2-3b-instruct:free",
    "nousresearch/hermes-3-llama-3.1-405b:free",
    "inclusionai/ling-2.6-flash",
    "meta-llama/llama-3.1-8b-instruct",
    "mistralai/mistral-nemo",
    "ibm-granite/granite-4.0-h-micro",
    "openai/gpt-oss-20b",
    "sao10k/l3-lunaris-8b",
    "meta-llama/llama-3.2-1b-instruct",
    "amazon/nova-micro-v1",
    "qwen/qwen-2.5-7b-instruct",
    "cohere/command-r7b-12-2024",
    "mistralai/mistral-small-24b-instruct-2501",
    "ibm-granite/granite-4.1-8b",
    "arcee-ai/trinity-mini",
    "google/gemma-3-4b-it",
    "google/gemma-3-12b-it",
    "gryphe/mythomax-l2-13b",
    "microsoft/phi-4",
    "qwen/qwen3-8b",
    "qwen/qwen3.5-flash-02-23",
    "google/gemma-4-26b-a4b-it",
    "mistralai/mistral-small-3.2-24b-instruct",
    "google/gemma-3-27b-it",
    "z-ai/glm-4.7-flash",
    "qwen/qwen3-coder-30b-a3b-instruct",
    "bytedance-seed/seed-1.6-flash",
    "qwen/qwen3-32b",
    "deepseek/deepseek-v4-flash",
    "stepfun/step-3.5-flash",
  ] as const,
};

// ── Default: auto-merge all provider models (deduplicated) ─────────────────────
// Dynamically aggregates every model from all other providers into one flat list.
// Duplicates across providers are removed so the "default" list is clean.

const ALL_PROVIDER_MODELS = Object.values(HELIX_PROVIDER_MODELS).flat();
const UNIQUE_DEFAULT_MODELS = Array.from(
  new Set(["default", ...ALL_PROVIDER_MODELS])
).sort();

export const HELIX_AI_MODELS: Record<HelixAIProvider, readonly string[]> = {
  default: UNIQUE_DEFAULT_MODELS,
  ...HELIX_PROVIDER_MODELS,
};
