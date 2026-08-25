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
  | "googleAIStudio"
  | "siliconFlow"
  | "fireworks";

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
  /**
   * Optional override base URL used for speech-to-text only. Some providers
   * (e.g. Ollama Cloud) serve transcription from a different endpoint than
   * their chat endpoint, so this lets STT be pointed elsewhere.
   */
  sttEndpoint?: string;
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
    // Ollama (local) serves transcription from its OpenAI-compatible /v1 base.
    sttEndpoint: "http://localhost:11434/v1",
  },
  {
    provider: "ollamaCloud",
    apiKey: process.env.OLLAMA_API_KEY || "",
    model: "gemma4:31b-cloud",
    endpoint: "https://ollama.com/v1",
    // Ollama Cloud serves transcription from its OpenAI-compatible /v1 base.
    sttEndpoint: "https://ollama.com/v1",
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
  {
    provider: "siliconFlow",
    apiKey: process.env.SILICON_FLOW_API_KEY || "",
    model: "tencent/Hy3",
    endpoint: "https://api.siliconflow.com/v1",
  },
  {
    provider: "fireworks",
    apiKey: process.env.FIREWORKS_API_KEY || "",
    model: "accounts/fireworks/models/glm-5p2",
    endpoint: "https://api.fireworks.ai/inference/v1",
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
  siliconFlow: "SiliconFlow",
  fireworks: "Fireworks",
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

const OLLAMA_CLOUD = [
  // Check model
  "gemma4:31b-cloud",
  "gpt-oss:20b-cloud",
  "minimax-m2.5:cloud",
  "minimax-m3:cloud",
  "nemotron-3-super:cloud",
  "nemotron-3-nano:30b-cloud",
  // Limit Expire Soon
  "glm-4.7:cloud",
  "ministral-3:14b-cloud",
  "gemma3:27b-cloud",
  "devstral-small-2:24b-cloud",
  "qwen3-coder-next:cloud",
  "qwen3-coder:480b-cloud",

  // Not Available
  "devstral-2:123b-cloud",
];

const HELIX_PROVIDER_MODELS: Record<
  Exclude<HelixAIProvider, "default">,
  readonly string[]
> = {
  googleAIStudio: [
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
  ] as const,
  deepinfra: [
    "anthropic/claude-opus-4-8",
    "anthropic/claude-fable-5",
    "deepseek-ai/DeepSeek-V4-Flash",
    "deepseek-ai/DeepSeek-V4-Flash-0731",
    "deepseek-ai/DeepSeek-V4-Pro",
    "deepseek-ai/DeepSeek-V4-Pro-0813",
    "google/gemini-3.1-flash-lite",
    "google/gemini-3.1-pro",
    "google/gemini-3.5-flash",
    "google/gemini-3.7-flash",
    "google/gemma-4-31B-it",
    "google/gemma-4-26B-A4B-it",
    "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
    "meta-llama/Llama-4-Scout-17B-16E-Instruct",
    "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
    "microsoft/phi-4",
    "MiniMaxAI/MiniMax-M2.5",
    "moonshotai/Kimi-K2.6",
    "moonshotai/Kimi-K2.7-Code",
    "moonshotai/Kimi-K3",
    "nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning",
    "nvidia/NVIDIA-Nemotron-3-Super-120B-A12B",
    "nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-120b-Turbo",
    "openai/gpt-oss-20b",
    "Qwen/Qwen3-32B",
    "Qwen/Qwen3-Coder-480B-A35B-Instruct-Turbo",
    "Qwen/Qwen3.5-397B-A17B",
    "Qwen/Qwen3.8-2.4T-A95B",
    "Qwen/Qwen3.6-35B-A3B",
    "Qwen/Qwen3-VL-30B-A3B-Instruct",
    "Qwen/Qwen3-VL-235B-A22B-Instruct",
    "stepfun-ai/Step-3.7-Flash",
    "XiaomiMiMo/MiMo-V2.5",
    "XiaomiMiMo/MiMo-V2.5-Pro",
    "zai-org/GLM-4.6",
    "zai-org/GLM-4.7",
    "zai-org/GLM-5",
    "zai-org/GLM-5.1",
    "zai-org/GLM-5.2",
  ],
  ollamaLocal: [
    "gemma3:1b",
    "gemma4:31b",
    "llama3.2:8b",
    "llama3.2:3b",
    "llama3.2:1b",
    "mistral:7b",
    "qwen2.5:7b",
    ...OLLAMA_CLOUD,
  ] as const,
  ollamaCloud: OLLAMA_CLOUD,
  deepseek: [
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
    "google/gemma-4-31b-it", // 0/0
    "mistral/leanstral-1-5", // 0/0
    "nvidia/nemotron-3-nano-30b-a3b", // 0/0
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning", // 0/0
    "nvidia/nemotron-3-super-120b-a12b", // 0/0
    "nvidia/nemotron-3-ultra-550b-a55b", // 0/0
    "nvidia/nemotron-3.5-content-safety", // 0/0
    "nvidia/nemotron-3.5-lightning-30b-a3b", // 0/0
    "nvidia/muse-glimmer-30b", // 0/0
    "novita/inclusionai/ling-3.0-tiny", // 0/0
    // Deprecated
    // "poolside/laguna-m.1",
    // "poolside/laguna-xs.2",

    // alibaba
    "alibaba/qwen3-max", // 1.20/4.80
    "alibaba/qwen3.7-max", // 2.50/10.00
    "alibaba/qwen3.7-plus", // 0.80/3.20
    "alibaba/qwen3-coder-flash", // 0.08/0.24
    "alibaba/qwen3.7-plus", // 0.80/3.20
    "alibaba/qwen3-30b-a3b-instruct-2507", // 0.09/0.27

    // anthropic
    "anthropic/claude-opus-4-8", // 15.00/75.00
    "anthropic/claude-sonnet-4-6", // 3.00/15.00
    "anthropic/claude-fable-5", // 3.00/15.00
    "anthropic/claude-opus-5", // 15.00/75.00
    "anthropic/claude-sonnet-4-5", // 3.00/15.00

    // azure
    "azure/gpt-5.4-mini", // 0.15/0.60
    "azure/gpt-5.6-terra@swedencentral", // 2.50/10.00
    "azure/gpt-5-nano", // 0.05/0.20

    // bedrock
    "bedrock/claude-haiku-4-5@eu-west-1", // 0.25/1.25
    "bedrock/claude-opus-4-7", // 15.00/75.00
    "bedrock/claude-opus-4-7@eu-central-1", // 15.00/75.00
    "bedrock/claude-sonnet-4-5@eu-central-1", // 3.00/15.00
    "bedrock/claude-sonnet-4-6", // 3.00/15.00

    // coding
    "coding/gemini-2.5-flash", // 0.075/0.30
    "coding/gemini-2.5-pro", // 1.25/5.00

    // deepinfra
    "deepinfra/nvidia/Nemotron-3-Nano-30B-A3B", // 0.04/0.18
    "deepinfra/Qwen/Qwen3-235B-A22B", // 0.06/0.09
    "deepinfra/Qwen/Qwen3-235B-A22B-Instruct-2507", // 0.06/0.09

    // deepseek
    "deepseek/deepseek-v4-flash", // 0.07/0.14
    "deepseek/deepseek-v4-pro", // 0.27/1.10

    // doubleword
    "doubleword/glm-5.2:flex", // 0.35/1.40

    // fireworks
    "fireworks/deepseek-v4-flash", // 0.07/0.14
    "fireworks/deepseek-v4-pro", // 0.27/1.10
    "fireworks/glm-5.2", // 0.50/1.50
    "fireworks/gpt-oss-20b", // 0.06/0.27
    "fireworks/minimax-m3", // 0.20/0.80

    // google
    "google/gemini-3.1-flash-lite", // 0.025/0.10
    "google/gemini-3.5-flash-lite", // 0.04/0.18
    "google/gemini-3.5-flash", // 0.075/0.30
    "google/gemini-3.5-flash-lite:flex", // 0.02/0.10
    "google/gemini-3.6-flash", // 0.075/0.30
    "google/gemma-4-31b-it", // 0/0
    // groq
    "groq/openai/gpt-oss-120b", // 0.15/0.60
    "groq/openai/gpt-oss-20b", // 0.05/0.20
    // minimaxi
    "minimaxi/minimax-m3", // 0.20/0.80
    "minimaxi/MiniMax-M2.5", // 0.15/0.60
    "minimaxi/MiniMax-M2.5-highspeed", // 0.15/0.60
    "minimaxi/MiniMax-M2.7-highspeed", // 0.20/0.80

    // minstral
    "mistral/open-mistral-7b", // 0.05/0.15
    "mistral/mistral-medium-3-5", // 0.40/1.20

    // moonshot
    "moonshot/kimi-k2.7-code", // 0.60/2.40
    "moonshot/kimi-k3", // 1.00/4.00
    "moonshot/kimi-k2.6", // 0.60/2.40

    // nebius
    "nebius/qwen/qwen3-30b-a3b-instruct-2507", // 0.09/0.27
    "nebius/qwen/qwen3-235b-a22b-instruct-2507", // 0.07/0.14
    "nebius/zai-org/glm-5.1", // 0.40/1.20

    // novita
    "novita/minimax/minimax-m2.7", // 0.20/0.80
    "novita/tencent/hy3", // 0.25/0.50

    // openai
    "openai/gpt-4.1-mini", // 0.15/0.60
    "openai/gpt-4.1-nano", // 0.05/0.20
    "openai/gpt-5-mini", // 0.15/0.60
    "openai/gpt-5.4-nano", // 0.05/0.20
    "openai/gpt-5.4", // 2.50/10.00
    "openai/gpt-5.5", // 2.50/10.00
    "openai/gpt-5.6-sol", // 2.50/10.00
    "openai/gpt-5.6-terra", // 2.50/10.00

    // openai-responses
    "openai-responses/gpt-5-nano", // 0.05/0.20
    "openai-responses/gpt-5.4-mini", // 0.15/0.60

    // perplexity
    "perplexity/sonar", // 1.00/1.00

    // vertex
    "vertex/claude-4-5-sonnet", // 3.00/15.00
    "vertex/claude-opus-4-7", // 15.00/75.00
    "vertex/claude-fable-5", // 3.00/15.00
    "vertex/gemini-3.1-flash-lite", // 0.025/0.10
    "vertex/gemini-3.1-flash-lite@eu", // 0.025/0.10
    "vertex/gemini-3.1-flash-image", // 0.075/0.30
    "vertex/gemini-3.5-flash-lite", // 0.04/0.18
    "vertex/gemini-3.5-flash", // 0.075/0.30
    "vertex/gemini-3.5-flash:flex", // 0.04/0.18
    "vertex/gemini-3.6-flash", // 0.075/0.30
    "vertex/gemini-3.7-flash", // 0.075/0.30

    // xai
    "xai/grok-3-mini", // 0.20/0.80
    "xai/grok-4-1-fast-non-reasoning", // 0.20/0.80
    "xai/grok-4-1-fast-reasoning", // 0.30/1.20
    "xai/grok-4-fast", // 0.20/0.80
    "xai/grok-4.3", // 3.00/15.00

    // xiaomi
    "xiaomi/mimo-v2.5", // 0.10/0.30
    "xiaomi/mimo-v2.5-pro", // 0.40/1.20

    // zai
    "zai/glm-5.2", // 0.50/1.50
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
  siliconFlow: [
    "tencent/Hy3",
    "meituan-longcat/LongCat-2.0",
    "zai-org/GLM-5.2",
    "moonshotai/Kimi-K2.7-Code",
    "MiniMaxAI/MiniMax-M3",
    "nex-agi/Nex-N2-Pro",
    "deepseek-ai/DeepSeek-V4-Pro",
    "deepseek-ai/DeepSeek-V4-Flash",
    "Qwen/Qwen3.6-35B-A3B",
    "Qwen/Qwen3.5-122B-A10B",
    "google/gemma-4-31B-it",
    "stepfun-ai/Step-3.5-Flash",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
  ] as const,
  fireworks: [
    // new
    "accounts/fireworks/models/nemotron-lightning-3p5-30b-a3b",
    // previous
    "accounts/fireworks/models/muse-glimmer-30b",
    "accounts/fireworks/models/glm-5p2",
    "accounts/fireworks/models/kimi-k2p7-code",
    "accounts/fireworks/models/kimi-k3",
    "accounts/fireworks/models/minimax-m3",
    "accounts/fireworks/models/deepseek-v4-pro",
    "accounts/fireworks/models/deepseek-v4-pro-0813",
    "accounts/fireworks/models/kimi-k2p6",
    "accounts/fireworks/models/glm-5p1",
    "accounts/fireworks/models/gpt-oss-120b",
    "accounts/fireworks/models/nemotron-3-ultra-nvfp4",
    "accounts/fireworks/models/deepseek-v4-flash",
    "accounts/fireworks/models/deepseek-v4-flash-0731",
    "accounts/fireworks/models/qwen3p8-2p4t-a95b",
  ],
};

export const HELIX_NON_SUPPORTED_JSON_OBJECT_PROVIDER = ["siliconFlow"];

// ── Default: auto-merge all provider models (deduplicated) ─────────────────────
// Dynamically aggregates every model from all other providers into one flat list.
// Duplicates across providers are removed so the "default" list is clean.

const ALL_PROVIDER_MODELS = Object.values(HELIX_PROVIDER_MODELS).flat();
const UNIQUE_DEFAULT_MODELS = Array.from(
  new Set(["default", ...ALL_PROVIDER_MODELS]),
).sort();

export const HELIX_AI_MODELS: Record<HelixAIProvider, readonly string[]> = {
  default: UNIQUE_DEFAULT_MODELS,
  ...HELIX_PROVIDER_MODELS,
};

// ── Speech-to-text (STT) models per provider ───────────────────────────────────
// Providers that expose an OpenAI-compatible `/v1/audio/transcriptions`
// endpoint. Providers with no entry are considered unsupported for AI STT.
// "default" follows the env-configured base URL; Ollama providers require an
// STT endpoint override to point at an OpenAI-compatible transcription server.

export const HELIX_STT_MODELS: Partial<
  Record<HelixAIProvider, readonly string[]>
> = {
  default: ["whisper-1", "whisper-large-v3-turbo"],
  openai: ["whisper-1", "gpt-4o-mini-transcribe", "gpt-4o-transcribe"],
  groq: [
    "whisper-large-v3",
    "whisper-large-v3-turbo",
    "distil-whisper-large-v3-en",
  ],
  deepinfra: ["openai/whisper-large-v3"],
  // SiliconFlow rotated its standalone ASR models offline; speech processing now
  // routes through the Omni multimodal models via /chat/completions (audio input).
  siliconFlow: [
    "Qwen/Qwen3-Omni-30B-A3B-Instruct",
    "Qwen/Qwen3-Omni-30B-A3B-Thinking",
  ],
  fireworks: ["accounts/fireworks/models/whisper-v3"],
  ollamaLocal: ["whisper"],
  ollamaCloud: ["whisper"],
};

/** Providers that expose at least one selectable STT model. */
export const HELIX_STT_PROVIDERS = (
  Object.keys(HELIX_STT_MODELS) as HelixAIProvider[]
).filter((p) => (HELIX_STT_MODELS[p]?.length ?? 0) > 0);
