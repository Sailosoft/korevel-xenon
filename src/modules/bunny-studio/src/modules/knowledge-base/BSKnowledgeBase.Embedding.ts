// BSKnowledgeBase.Embedding — Knowledge Base embedding helpers (compat shim).
//
// The embedding configuration and models now live in Helix
// (HelixConfig.Embedding.ts) and the generic embedding utilities live in
// HelixEmbedding.ts. This file only remains as a thin compatibility layer that
// injects the Bunny Studio frontend API token into client-side embedding calls
// (the provider API key itself never leaves the server).

"use client";

import {
  embedTexts as helixEmbedTexts,
  embedText as helixEmbedText,
} from "@/src/modules/helix/src/HelixEmbedding";
import {
  BS_API_TOKEN_HEADER,
  getBSApiToken,
} from "../../BSApiSecurity";

// ── Config & models — now sourced from Helix ───────────────────────────────

export {
  DEFAULT_EMBEDDING_MODEL,
  DEFAULT_EMBEDDING_PROVIDER,
  DEFAULT_EMBEDDING_DIMENSIONS,
  EMBEDDING_MODELS,
  HELIX_EMBEDDING_MODELS,
  HELIX_PROVIDER_EMBEDDING_MODELS,
  HELIX_PROVIDER_EMBEDDING_ENDPOINTS,
  HELIX_PROVIDER_EMBEDDING_API_KEY_ENV,
  HELIX_EMBEDDING_MODEL_DIMENSIONS,
  isHelixEmbeddingProvider,
  getEmbeddingModelProvider,
  getProviderDefaultEmbeddingModel,
} from "@/src/modules/helix/src/HelixConfig.Embedding";
export type { HelixEmbeddingProvider } from "@/src/modules/helix/src/HelixConfig.Embedding";
export type {
  HelixEmbedResponse,
  HelixEmbeddingOption,
  HelixGenerateEmbeddingsOption,
} from "@/src/modules/helix/src/HelixEmbedding";

// ── Client helpers — inject the Bunny Studio API token ─────────────────────

/** Attach the frontend-only API token header to knowledge-base API calls. */
const tokenHeaders = (): Record<string, string> => ({
  [BS_API_TOKEN_HEADER]: getBSApiToken() ?? "",
});

/**
 * Generate vector embeddings for one or more text inputs via the server route.
 * The provider is inferred from the model (default: siliconFlow). Keeps the
 * old `(inputs, model)` signature for the Knowledge Base RAG pipeline.
 */
export async function embedTexts(
  inputs: string[],
  model?: string,
): Promise<number[][]> {
  return helixEmbedTexts(inputs, { model, headers: tokenHeaders() });
}

/** Convenience wrapper for a single text input (used by RAG query retrieval). */
export async function embedText(
  input: string,
  model?: string,
): Promise<number[]> {
  return helixEmbedText(input, { model, headers: tokenHeaders() });
}
