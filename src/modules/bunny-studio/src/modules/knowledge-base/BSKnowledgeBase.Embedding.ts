// BSKnowledgeBase.Embedding — Client embedding service for the Knowledge Base.
//
// Routes embedding generation through the server (`/api/bunny-studio/knowledge/embed`)
// so the provider API key (SiliconFlow) never leaves the server. The default
// model is SiliconFlow's Qwen3-Embedding-0.6B (feature: BSEmbeddings).

"use client";

import {
  BS_API_TOKEN_HEADER,
  getBSApiToken,
} from "../../BSApiSecurity";

/** Default embedding model — Qwen3-Embedding-0.6B (cheapest / fastest). */
export const DEFAULT_EMBEDDING_MODEL = "Qwen/Qwen3-Embedding-0.6B";

/** Available embedding models (feature: BSEmbeddings / BSKnowledgeBase). */
export const EMBEDDING_MODELS = [
  "Qwen/Qwen3-Embedding-0.6B",
  "Qwen/Qwen3-Embedding-4B",
  "Qwen/Qwen3-Embedding-8B",
] as const;

export interface BSEmbedResponse {
  embeddings: number[][];
  model: string;
  dimensions: number;
}

/**
 * Generate vector embeddings for one or more text inputs via the server route.
 * Batches are kept under the provider's per-request limit (max 32 items).
 */
export async function embedTexts(
  inputs: string[],
  model: string = DEFAULT_EMBEDDING_MODEL,
): Promise<number[][]> {
  if (inputs.length === 0) return [];
  const batchSize = 16;
  const all: number[][] = [];

  for (let i = 0; i < inputs.length; i += batchSize) {
    const batch = inputs.slice(i, i + batchSize);
    const res = await fetch("/api/bunny-studio/knowledge/embed", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [BS_API_TOKEN_HEADER]: getBSApiToken() ?? "",
      },
      body: JSON.stringify({ inputs: batch, model }),
    });
    const data = (await res.json()) as Partial<BSEmbedResponse> & {
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
  model: string = DEFAULT_EMBEDDING_MODEL,
): Promise<number[]> {
  const vectors = await embedTexts([input], model);
  return vectors[0] ?? [];
}
