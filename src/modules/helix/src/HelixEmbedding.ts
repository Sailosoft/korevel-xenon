// HelixEmbedding — Embedding generation service for Helix.
//
// Provider-agnostic embedding generation used by RAG pipelines (e.g. Bunny
// Studio's Knowledge Base). SiliconFlow is the default provider (feature:
// HelixEmbedding); DeepInfra is also supported.
//
// Two surfaces live here:
//  - generateEmbeddings(): server-side. Calls the provider's OpenAI-compatible
//    /embeddings endpoint directly using the provider env API key. The key
//    never leaves the server — this is what the API route delegates to.
//  - embedTexts() / embedText(): client-side. POST to a server route (default:
//    /api/bunny-studio/knowledge/embed) which proxies to generateEmbeddings(),
//    so the provider key stays server-side. Callers may pass extra headers
//    (e.g. a frontend API token) and an endpoint override.

import {
  DEFAULT_EMBEDDING_DIMENSIONS,
  DEFAULT_EMBEDDING_MODEL,
  HELIX_EMBEDDING_MODEL_DIMENSIONS,
  HELIX_PROVIDER_EMBEDDING_API_KEY_ENV,
  HELIX_PROVIDER_EMBEDDING_ENDPOINTS,
  getEmbeddingModelProvider,
  getProviderDefaultEmbeddingModel,
  isHelixEmbeddingProvider,
  type HelixEmbeddingProvider,
} from "./HelixConfig.Embedding";

// ── Shared types ──────────────────────────────────────────────────────────────

/** Response shape of an embedding request (client route + server provider). */
export interface HelixEmbedResponse {
  embeddings: number[][];
  model: string;
  dimensions: number;
}

/** Options accepted by the client-side embedding helpers. */
export interface HelixEmbeddingOption {
  provider?: HelixEmbeddingProvider;
  model?: string;
  /** Server route to proxy the request through (client-side calls only). */
  endpoint?: string;
  /** Extra headers to attach (client-side calls only, e.g. an API token). */
  headers?: Record<string, string>;
}

/** Default client-side proxy route (kept for the Bunny Studio Knowledge Base). */
const DEFAULT_CLIENT_ENDPOINT = "/api/bunny-studio/knowledge/embed";

/** Batches are kept under the provider's per-request limit (max 32 items). */
const BATCH_SIZE = 16;

// ─── Server-side ──────────────────────────────────────────────────────────────

/** Options accepted by the server-side provider call. */
export interface HelixGenerateEmbeddingsOption {
  /** The text inputs to embed (1–32 per request, non-empty strings). */
  inputs: string[];
  provider?: HelixEmbeddingProvider;
  model?: string;
  /** Optional API key override; defaults to the provider's env var key. */
  apiKey?: string;
}

/**
 * Call the provider's OpenAI-compatible `/embeddings` endpoint directly.
 * Resolves the provider (explicit, else inferred from the model, else the
 * default siliconFlow), the effective model, the API key (env var), and the
 * endpoint — all sourced from HelixConfig.Embedding.
 */
export async function generateEmbeddings(
  option: HelixGenerateEmbeddingsOption,
): Promise<HelixEmbedResponse> {
  const provider = isHelixEmbeddingProvider(option.provider ?? "")
    ? (option.provider as HelixEmbeddingProvider)
    : getEmbeddingModelProvider(option.model ?? DEFAULT_EMBEDDING_MODEL);
  const model =
    option.model || getProviderDefaultEmbeddingModel(provider);

  const apiKeyEnv = HELIX_PROVIDER_EMBEDDING_API_KEY_ENV[provider];
  const apiKey = option.apiKey || process.env[apiKeyEnv];
  if (!apiKey) {
    throw new Error(`${apiKeyEnv} is not configured on the server.`);
  }

  const endpoint = HELIX_PROVIDER_EMBEDDING_ENDPOINTS[provider];
  const dimensions =
    HELIX_EMBEDDING_MODEL_DIMENSIONS[model] ?? DEFAULT_EMBEDDING_DIMENSIONS;

  const upstream = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: option.inputs,
      // SiliconFlow honors an explicit output dimension; DeepInfra infers the
      // dimension from the model itself.
      ...(provider === "siliconFlow"
        ? { encoding_format: "float", dimensions }
        : {}),
    }),
  });

  if (!upstream.ok) {
    const raw = await upstream.text();
    console.error("[HelixEmbedding] Upstream error:", upstream.status, raw);
    throw new Error(`Embedding provider error (${upstream.status}).`);
  }

  const data = (await upstream.json()) as {
    data?: Array<{ embedding: number[] }>;
  };
  const embeddings = (data.data ?? []).map((d) => d.embedding);

  return { embeddings, model, dimensions };
}

// ─── Client-side ──────────────────────────────────────────────────────────────

/**
 * Generate vector embeddings for one or more text inputs via a server route.
 * Batches are kept under the provider's per-request limit. The provider is
 * resolved from the option or inferred from the requested model.
 */
export async function embedTexts(
  inputs: string[],
  option: HelixEmbeddingOption = {},
): Promise<number[][]> {
  if (inputs.length === 0) return [];
  const provider =
    option.provider ??
    getEmbeddingModelProvider(option.model ?? DEFAULT_EMBEDDING_MODEL);
  const all: number[][] = [];

  for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
    const batch = inputs.slice(i, i + BATCH_SIZE);
    const res = await fetch(option.endpoint ?? DEFAULT_CLIENT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(option.headers ?? {}),
      },
      body: JSON.stringify({
        inputs: batch,
        model: option.model,
        provider,
      }),
    });
    const data = (await res.json()) as Partial<HelixEmbedResponse> & {
      error?: string;
    };
    if (!res.ok || !data.embeddings) {
      throw new Error(data.error ?? "Embedding request failed.");
    }
    all.push(...data.embeddings);
  }
  return all;
}

/** Convenience wrapper for a single text input (used by RAG query retrieval). */
export async function embedText(
  input: string,
  option: HelixEmbeddingOption = {},
): Promise<number[]> {
  const vectors = await embedTexts([input], option);
  return vectors[0] ?? [];
}

// Re-export for convenience — callers resolving provider/model often need these.
export {
  DEFAULT_EMBEDDING_MODEL,
  DEFAULT_EMBEDDING_PROVIDER,
  getEmbeddingModelProvider,
  getProviderDefaultEmbeddingModel,
  isHelixEmbeddingProvider,
} from "./HelixConfig.Embedding";
export type { HelixEmbeddingProvider } from "./HelixConfig.Embedding";
