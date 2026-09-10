/**
 * ───────────────────────────────────────────────────────────────────────────────
 * Helix — AI Provider & Configuration Types — Single source of truth
 * ───────────────────────────────────────────────────────────────────────────────
 * All AI provider identity, options, config shapes, and provider data live
 * here.  Per-provider model catalogs live in ./models (HelixModel.<Provider>.ts)
 * and are aggregated below into HELIX_PROVIDER_MODELS / HELIX_AI_MODELS.
 * Consumers (BunnyAI, book-builder, etc.) subscribe to Helix for their AI
 * configuration needs rather than defining their own.
 */

import { DEEP_INFRA_MODELS } from "./models/HelixModel.DeepInfra";
import { DEEPSEEK_MODELS } from "./models/HelixModel.DeepSeek";
import { FIREWORKS_MODELS } from "./models/HelixModel.Fireworks";
import { GOOGLE_AI_STUDIO_MODELS } from "./models/HelixModel.GoogleAIStudio";
import { GROQ_MODELS } from "./models/HelixModel.Groq";
import { OLLAMA_CLOUD_MODELS } from "./models/HelixModel.OllamaCloud";
import { OLLAMA_LOCAL_MODELS } from "./models/HelixModel.OllamaLocal";
import { OPENAI_MODELS } from "./models/HelixModel.OpenAI";
import { OPEN_ROUTER_MODELS } from "./models/HelixModel.OpenRouter";
import { REQUESTY_MODELS } from "./models/HelixModel.Requesty";
import { SILICON_FLOW_MODELS } from "./models/HelixModel.SiliconFlow";

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

/**
 * Resolve the effective sampling temperature for a chat call.
 *
 * Some providers/models only accept the default temperature (1) — notably
 * OpenAI reasoning models (o1/o3/o4) reject any other value with:
 *   "Unsupported value: 'temperature' does not support 0.7 with this model.
 *    Only the default (1) value is supported."
 * For the "openai" provider we therefore force 1.0. All other providers keep
 * the caller-supplied value, falling back to the 0.7 default.
 */
export function resolveTemperature(
  provider?: string,
  temperature?: number,
): number {
  if (provider === "openai") return 1;
  return temperature ?? 0.7;
}

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
//
// Each provider's catalog lives in its own file under ./models
// (HelixModel.<Provider>.ts) and is referenced below. Ollama (local) and
// Ollama Cloud share the cloud catalog (see HelixModel.OllamaLocal.ts).

const HELIX_PROVIDER_MODELS: Record<
  Exclude<HelixAIProvider, "default">,
  readonly string[]
> = {
  googleAIStudio: GOOGLE_AI_STUDIO_MODELS,
  deepinfra: DEEP_INFRA_MODELS,
  ollamaLocal: OLLAMA_LOCAL_MODELS,
  ollamaCloud: OLLAMA_CLOUD_MODELS,
  deepseek: DEEPSEEK_MODELS,
  groq: GROQ_MODELS,
  openai: OPENAI_MODELS,
  openRouter: OPEN_ROUTER_MODELS,
  requesty: REQUESTY_MODELS,
  siliconFlow: SILICON_FLOW_MODELS,
  fireworks: FIREWORKS_MODELS,
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
