// BSKnowledgeBase.Embedding — Knowledge Base embedding helpers (engine router).
//
// Embedding configuration and models live in Helix (HelixConfig.Embedding.ts);
// the provider-agnostic server/client utilities live in HelixEmbedding.ts, and
// the local browser runtime lives in HelixEmbedding.Transformers.ts.
//
// This file routes a group's embedding engine to the right place:
//  - "transformers": local Web Worker (dynamic import — never bundled server-side)
//  - SiliconFlow / DeepInfra: server route, with the Bunny Studio token header
//    (the provider API key itself never leaves the server).

"use client";

import {
  embedTexts as helixEmbedTexts,
  embedText as helixEmbedText,
} from "@/src/modules/helix/src/HelixEmbedding";
import type { HelixEmbeddingProgress } from "@/src/modules/helix/src/HelixEmbedding.Transformers";
import {
  DEFAULT_EMBEDDING_ENGINE,
  HELIX_TRANSFORMERS_ENGINE,
  getEmbeddingModelEngine,
  getProviderDefaultEmbeddingModelForEngine,
  type HelixEmbeddingEngine,
} from "@/src/modules/helix/src/HelixConfig.Embedding";
import {
  BS_API_TOKEN_HEADER,
  getBSApiToken,
} from "../../BSApiSecurity";

// ── Config & models — now sourced from Helix ───────────────────────────────

export {
  DEFAULT_EMBEDDING_MODEL,
  DEFAULT_EMBEDDING_PROVIDER,
  DEFAULT_EMBEDDING_DIMENSIONS,
  DEFAULT_EMBEDDING_ENGINE,
  DEFAULT_TRANSFORMERS_EMBEDDING_MODEL,
  HELIX_TRANSFORMERS_ENGINE,
  HELIX_EMBEDDING_ENGINE_LABELS,
  HELIX_TRANSFORMERS_EMBEDDING_MODELS,
  HELIX_TRANSFORMERS_EMBEDDING_MODEL_DIMENSIONS,
  EMBEDDING_MODELS,
  HELIX_EMBEDDING_MODELS,
  HELIX_PROVIDER_EMBEDDING_MODELS,
  HELIX_PROVIDER_EMBEDDING_ENDPOINTS,
  HELIX_PROVIDER_EMBEDDING_API_KEY_ENV,
  HELIX_EMBEDDING_MODEL_DIMENSIONS,
  isHelixEmbeddingProvider,
  isHelixEmbeddingEngine,
  isTransformersEmbeddingModel,
  getEmbeddingModelProvider,
  getProviderDefaultEmbeddingModel,
  getEmbeddingModelEngine,
  getEmbeddingModelDimensions,
  getEmbeddingModelsForEngine,
  getProviderDefaultEmbeddingModelForEngine,
} from "@/src/modules/helix/src/HelixConfig.Embedding";
export type {
  HelixEmbeddingProvider,
  HelixEmbeddingEngine,
} from "@/src/modules/helix/src/HelixConfig.Embedding";
export type {
  HelixEmbedResponse,
  HelixEmbeddingOption,
  HelixGenerateEmbeddingsOption,
} from "@/src/modules/helix/src/HelixEmbedding";
export type { HelixEmbeddingProgress } from "@/src/modules/helix/src/HelixEmbedding.Transformers";

// ── Engine routing ────────────────────────────────────────────────────────

/** Options accepted by the Knowledge Base embedding helpers. */
export interface BSEmbedOptions {
  /** Explicit engine; inferred from `model` when omitted (default: transformers). */
  engine?: HelixEmbeddingEngine;
  /** Model id; defaults to the resolved engine's default model. */
  model?: string;
  /** Queries get the model's retrieval prefix (local bge models only). */
  isQuery?: boolean;
  /** Model-loading progress (local engine only). */
  onProgress?: HelixEmbeddingProgress;
}

/** Resolve the engine + model a request should use (engine wins over model). */
function resolveEmbeddingTarget(options: BSEmbedOptions): {
  engine: HelixEmbeddingEngine;
  model: string;
} {
  const engine =
    options.engine ??
    (options.model
      ? getEmbeddingModelEngine(options.model)
      : DEFAULT_EMBEDDING_ENGINE);
  const model =
    options.model || getProviderDefaultEmbeddingModelForEngine(engine);
  return { engine, model };
}

/** Attach the frontend-only API token header to knowledge-base API calls. */
const tokenHeaders = (): Record<string, string> => ({
  [BS_API_TOKEN_HEADER]: getBSApiToken() ?? "",
});

/**
 * Generate vector embeddings for one or more text inputs. Local groups run the
 * Transformers.js worker (dynamically imported so the server bundle never pulls
 * browser ML code); LLM groups use the server route with the BS token header.
 */
export async function embedTexts(
  inputs: string[],
  options: BSEmbedOptions = {},
): Promise<number[][]> {
  if (inputs.length === 0) return [];
  const { engine, model } = resolveEmbeddingTarget(options);

  if (engine === HELIX_TRANSFORMERS_ENGINE) {
    const { embedTextsLocal } = await import(
      "@/src/modules/helix/src/HelixEmbedding.Transformers"
    );
    return embedTextsLocal(inputs, {
      model,
      isQuery: options.isQuery,
      onProgress: options.onProgress,
    });
  }

  return helixEmbedTexts(inputs, { model, headers: tokenHeaders() });
}

/** Convenience wrapper for a single text input (used by RAG query retrieval). */
export async function embedText(
  input: string,
  options: BSEmbedOptions = {},
): Promise<number[]> {
  const { engine, model } = resolveEmbeddingTarget(options);

  if (engine === HELIX_TRANSFORMERS_ENGINE) {
    const { embedTextLocal } = await import(
      "@/src/modules/helix/src/HelixEmbedding.Transformers"
    );
    return embedTextLocal(input, {
      model,
      isQuery: options.isQuery,
      onProgress: options.onProgress,
    });
  }

  return helixEmbedText(input, { model, headers: tokenHeaders() });
}
