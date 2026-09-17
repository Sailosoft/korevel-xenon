/**
 * ───────────────────────────────────────────────────────────────────────────────
 * Helix — Embedding Model Library
 * ───────────────────────────────────────────────────────────────────────────────
 * The only embedding-specific data lives here: the model collections per
 * provider, the default provider/model, the OpenAI-compatible embeddings
 * endpoints, the env vars that hold each provider's API key, and the output
 * dimensions of each model.
 *
 * Provider identity, API keys, and endpoints are reused from HelixConfig.ts
 * (HelixAIProvider / HELIX_AI_PROVIDERS) — no duplicated config.
 *
 * Two engines can produce vectors:
 *  - "transformers": local, browser-side Transformers.js (default — no API key)
 *  - a HelixEmbeddingProvider (SiliconFlow / DeepInfra) reached through the
 *    Helix server route (feature: HelixEmbedding).
 */

import { HELIX_PROVIDER_LABELS, type HelixAIProvider } from "./HelixConfig";

// ── Provider identity ─────────────────────────────────────────────────────────
// Reuses the shared HelixAIProvider union. Embedding generation currently
// supports "siliconFlow" (default) and "deepinfra" — the type narrows the union
// to embedding-capable providers.

/** Providers that currently support embedding generation via Helix. */
export type HelixEmbeddingProvider = Extract<
  HelixAIProvider,
  "siliconFlow" | "deepinfra"
>;

// ── Embedding engines ─────────────────────────────────────────────────────────
// An engine is either the local Transformers.js runtime (browser Web Worker,
// no API key, offline after the first model download) or one of the LLM
// embedding providers reached through the Helix server route.

/** Embedding engine id for the local, browser-side Transformers.js runtime. */
export const HELIX_TRANSFORMERS_ENGINE = "transformers" as const;

/** Every engine a consumer can use to produce vectors. */
export type HelixEmbeddingEngine = "transformers" | HelixEmbeddingProvider;

/** Human-readable labels for each embedding engine (select fields, tables). */
export const HELIX_EMBEDDING_ENGINE_LABELS: Record<
  HelixEmbeddingEngine,
  string
> = {
  transformers: "Transformers.js (Local)",
  siliconFlow: HELIX_PROVIDER_LABELS.siliconFlow,
  deepinfra: HELIX_PROVIDER_LABELS.deepinfra,
};

// ── Local Transformers.js model catalog ───────────────────────────────────────
// Hugging Face hub ids of the ONNX models Transformers.js can run in-browser.

/** Local Transformers.js embedding models selectable inside a knowledge group. */
export const HELIX_TRANSFORMERS_EMBEDDING_MODELS = [
  "Xenova/bge-small-en-v1.5",
  "Xenova/bge-base-en-v1.5",
  "Xenova/all-MiniLM-L6-v2",
  "Xenova/paraphrase-multilingual-MiniLM-L12-v2",
  "Xenova/nomic-embed-text-v1.5",
  "Xenova/bge-m3",
] as const;

/** Output dimensions per local Transformers.js model. */
export const HELIX_TRANSFORMERS_EMBEDDING_MODEL_DIMENSIONS: Record<
  string,
  number
> = {
  "Xenova/bge-small-en-v1.5": 384,
  "Xenova/bge-base-en-v1.5": 768,
  "Xenova/all-MiniLM-L6-v2": 384,
  "Xenova/paraphrase-multilingual-MiniLM-L12-v2": 384,
  "Xenova/nomic-embed-text-v1.5": 768,
  "Xenova/bge-m3": 1024,
};

// ── Provider-specific embedding model lists ───────────────────────────────────
// Add or remove embedding models here per provider. The "default" key is
// auto-computed by merging all other providers — no manual duplication needed.

export const HELIX_PROVIDER_EMBEDDING_MODELS: Partial<
  Record<Exclude<HelixAIProvider, "default">, readonly string[]>
> = {
  // SiliconFlow — Qwen3 embedding family (cheap / fast, the default).
  siliconFlow: [
    "Qwen/Qwen3-Embedding-0.6B",
    "Qwen/Qwen3-Embedding-4B",
    "Qwen/Qwen3-Embedding-8B",
  ] as const,
  // DeepInfra — open embedding models served on their OpenAI-compatible API.
  deepinfra: [
    "BAAI/bge-m3",
    "BAAI/bge-large-en-v1.5",
    "jinaai/jina-embeddings-v3",
    "nomic-ai/nomic-embed-text-v1.5",
    "sentence-transformers/all-MiniLM-L6-v2",
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
    "sentence-transformers/multi-qa-mpnet-base-dot-v1",
  ] as const,
};

// ── Default: auto-merge all embedding models (deduplicated) ───────────────────
// Dynamically aggregates every embedding model from all other providers into one
// flat list (insertion order: siliconFlow first, then deepinfra). Duplicates
// across providers are removed so the "default" list is clean.

const ALL_EMBEDDING_PROVIDER_MODELS = Object.values(
  HELIX_PROVIDER_EMBEDDING_MODELS,
).flat();
const UNIQUE_DEFAULT_EMBEDDING_MODELS = Array.from(
  new Set(["default", ...ALL_EMBEDDING_PROVIDER_MODELS]),
).sort();

export const HELIX_EMBEDDING_MODELS: Partial<
  Record<HelixAIProvider, readonly string[]>
> = {
  default: UNIQUE_DEFAULT_EMBEDDING_MODELS,
  ...HELIX_PROVIDER_EMBEDDING_MODELS,
};

/** Flat list of every selectable embedding model (used by model pickers). */
export const EMBEDDING_MODELS: readonly string[] = ALL_EMBEDDING_PROVIDER_MODELS;

// ── Defaults ──────────────────────────────────────────────────────────────────

/** Default embedding provider — SiliconFlow (cheapest / fastest). */
export const DEFAULT_EMBEDDING_PROVIDER: HelixEmbeddingProvider = "siliconFlow";
/** Default embedding model — Qwen3-Embedding-0.6B. */
export const DEFAULT_EMBEDDING_MODEL = "Qwen/Qwen3-Embedding-0.6B";
/** Default vector dimension — matches the Qwen3-Embedding-0.6B output. */
export const DEFAULT_EMBEDDING_DIMENSIONS = 1024;
/** Default engine — local Transformers.js (offline, no API key). */
export const DEFAULT_EMBEDDING_ENGINE: HelixEmbeddingEngine = "transformers";
/** Default local model — bge-small-en-v1.5 (English, 384 dimensions, ~34MB). */
export const DEFAULT_TRANSFORMERS_EMBEDDING_MODEL =
  "Xenova/bge-small-en-v1.5";

// ── Provider endpoints & API keys ─────────────────────────────────────────────
// The API key itself is never bundled here — only the env var *name* that holds
// it server-side, so the key never leaves the server.

/** Per-provider OpenAI-compatible embeddings endpoint. */
export const HELIX_PROVIDER_EMBEDDING_ENDPOINTS: Record<
  HelixEmbeddingProvider,
  string
> = {
  siliconFlow: "https://api.siliconflow.com/v1/embeddings",
  deepinfra: "https://api.deepinfra.com/v1/openai/embeddings",
};

/** Env var that holds each provider's API key. */
export const HELIX_PROVIDER_EMBEDDING_API_KEY_ENV: Record<
  HelixEmbeddingProvider,
  string
> = {
  siliconFlow: "SILICON_FLOW_API_KEY",
  deepinfra: "DEEP_INFRA_API_KEY",
};

/**
 * Output dimensions per model (when the provider/model supports a fixed dim).
 * Covers both the LLM providers and the local Transformers.js catalog.
 */
export const HELIX_EMBEDDING_MODEL_DIMENSIONS: Partial<Record<string, number>> =
  {
    ...HELIX_TRANSFORMERS_EMBEDDING_MODEL_DIMENSIONS,
    "Qwen/Qwen3-Embedding-0.6B": 1024,
    "Qwen/Qwen3-Embedding-4B": 1024,
    "Qwen/Qwen3-Embedding-8B": 1024,
    "BAAI/bge-m3": 1024,
    "BAAI/bge-large-en-v1.5": 1024,
    "jinaai/jina-embeddings-v3": 1024,
    "nomic-ai/nomic-embed-text-v1.5": 768,
    "sentence-transformers/all-MiniLM-L6-v2": 384,
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2": 384,
    "sentence-transformers/multi-qa-mpnet-base-dot-v1": 768,
  };

// ── Type guard & resolvers ────────────────────────────────────────────────────

/** Checks whether an arbitrary string is a supported embedding-generation provider. */
export function isHelixEmbeddingProvider(
  value: string,
): value is HelixEmbeddingProvider {
  return (
    Object.keys(HELIX_PROVIDER_EMBEDDING_MODELS) as HelixAIProvider[]
  ).includes(value as HelixAIProvider);
}

/** Resolve which provider owns a given embedding model (default provider fallback). */
export function getEmbeddingModelProvider(
  model: string,
): HelixEmbeddingProvider {
  for (const provider of Object.keys(
    HELIX_PROVIDER_EMBEDDING_MODELS,
  ) as HelixEmbeddingProvider[]) {
    if (HELIX_PROVIDER_EMBEDDING_MODELS[provider]?.includes(model)) {
      return provider;
    }
  }
  return DEFAULT_EMBEDDING_PROVIDER;
}

/** Resolve the default embedding model for a provider (falls back to the global default). */
export function getProviderDefaultEmbeddingModel(
  provider: HelixEmbeddingProvider,
): string {
  return (
    HELIX_PROVIDER_EMBEDDING_MODELS[provider]?.[0] ?? DEFAULT_EMBEDDING_MODEL
  );
}

// ── Engine resolvers ──────────────────────────────────────────────────────────

/** Checks whether an arbitrary string is a known embedding engine. */
export function isHelixEmbeddingEngine(
  value: string,
): value is HelixEmbeddingEngine {
  return value === HELIX_TRANSFORMERS_ENGINE || isHelixEmbeddingProvider(value);
}

/** Checks whether a model id belongs to the local Transformers.js catalog. */
export function isTransformersEmbeddingModel(value: string): boolean {
  return (HELIX_TRANSFORMERS_EMBEDDING_MODELS as readonly string[]).includes(
    value,
  );
}

/**
 * Resolve which engine owns a model. Local Transformers.js models are checked
 * first, otherwise the model is attributed to its LLM provider.
 */
export function getEmbeddingModelEngine(model: string): HelixEmbeddingEngine {
  if (isTransformersEmbeddingModel(model)) return HELIX_TRANSFORMERS_ENGINE;
  return getEmbeddingModelProvider(model);
}

/** Resolve a model's vector dimension (falls back to the legacy 1024 default). */
export function getEmbeddingModelDimensions(model: string): number {
  return HELIX_EMBEDDING_MODEL_DIMENSIONS[model] ?? DEFAULT_EMBEDDING_DIMENSIONS;
}

/** Selectable models for an engine (local catalog or the provider's list). */
export function getEmbeddingModelsForEngine(
  engine: HelixEmbeddingEngine,
): readonly string[] {
  return engine === HELIX_TRANSFORMERS_ENGINE
    ? HELIX_TRANSFORMERS_EMBEDDING_MODELS
    : (HELIX_PROVIDER_EMBEDDING_MODELS[engine] ?? []);
}

/** Resolve an engine's default model (local default or the provider's first model). */
export function getProviderDefaultEmbeddingModelForEngine(
  engine: HelixEmbeddingEngine,
): string {
  return engine === HELIX_TRANSFORMERS_ENGINE
    ? DEFAULT_TRANSFORMERS_EMBEDDING_MODEL
    : getProviderDefaultEmbeddingModel(engine);
}
