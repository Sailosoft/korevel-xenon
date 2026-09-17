// HelixEmbedding.Transformers — local, browser-side embedding engine.
//
// Runs Transformers.js feature-extraction models inside a Web Worker (ONNX /
// WASM) so no API key and no server route are involved. Imported dynamically
// from client-only callers, which keeps @huggingface/transformers (and its
// Node-only onnxruntime-node dependency) out of the server bundle.
//
// Documents and queries both go through embedTextsLocal so the pooling and the
// bge retrieval prefix can never diverge between indexing and retrieval.

"use client";

import type { FeatureExtractionPipeline } from "@huggingface/transformers";
import { DEFAULT_TRANSFORMERS_EMBEDDING_MODEL } from "./HelixConfig.Embedding";

// ── Public types ──────────────────────────────────────────────────────────────

/** Progress hook for the "loading local embedding model" status banner. */
export type HelixEmbeddingProgress = (message: string) => void;

/** Options accepted by the local embedding helpers. */
export interface HelixLocalEmbeddingOptions {
  /** Hugging Face model id (defaults to bge-small-en-v1.5). */
  model?: string;
  /** Query inputs get the model-specific retrieval prefix (bge family only). */
  isQuery?: boolean;
  /** Called while a model downloads / loads (first run fetches ~34MB). */
  onProgress?: HelixEmbeddingProgress;
}

// ── Query prefix ──────────────────────────────────────────────────────────────

/** Retrieval prefix bge models expect on queries (never on documents). */
const BGE_QUERY_PREFIX =
  "Represent this sentence for searching relevant passages: ";

/** Checks whether a model belongs to the bge family (query prefix required). */
export function needsBgeQueryPrefix(model: string): boolean {
  return model.toLowerCase().includes("bge");
}

/** Prepend the retrieval prefix to queries of bge-family models. */
function prepareInputs(
  inputs: string[],
  model: string,
  isQuery: boolean,
): string[] {
  if (!isQuery || !needsBgeQueryPrefix(model)) return inputs;
  return inputs.map((text) => `${BGE_QUERY_PREFIX}${text}`);
}

// ── Worker plumbing ───────────────────────────────────────────────────────────

/** Local models are embedded in small batches to bound worker memory. */
const BATCH_SIZE = 8;

interface PendingRequest {
  model: string;
  resolve: (vectors: number[][]) => void;
  reject: (error: Error) => void;
  onProgress?: HelixEmbeddingProgress;
  lastPercent: number;
}

interface HelixEmbeddingWorkerResponse {
  id?: string;
  type: "result" | "error" | "progress";
  vectors?: number[][];
  error?: string;
  model?: string;
  progress?: number;
}

let worker: Worker | null = null;
let workerUnavailable = false;
const pending = new Map<string, PendingRequest>();
let requestSeq = 0;

/** Describe a model-load phase for the status banner. */
function describeProgress(percent?: number): string {
  return typeof percent === "number"
    ? `Loading local embedding model… ${Math.round(percent)}%`
    : "Loading local embedding model… first run downloads ~34MB";
}

function handleMessage(event: MessageEvent<HelixEmbeddingWorkerResponse>): void {
  const data = event.data;
  if (!data) return;

  if (data.type === "progress") {
    for (const request of pending.values()) {
      if (request.model !== data.model) continue;
      const percent = data.progress;
      if (
        typeof percent === "number" &&
        Math.abs(percent - request.lastPercent) < 5
      ) {
        continue;
      }
      request.lastPercent = typeof percent === "number" ? percent : 0;
      request.onProgress?.(describeProgress(percent));
    }
    return;
  }

  if (!data.id) return;
  const request = pending.get(data.id);
  if (!request) return;
  pending.delete(data.id);
  if (data.type === "result") {
    request.resolve(data.vectors ?? []);
  } else {
    request.reject(new Error(data.error ?? "Local embedding failed."));
  }
}

/** Fail every in-flight request (used when the worker itself dies). */
function failAllPending(error: Error): void {
  for (const request of pending.values()) request.reject(error);
  pending.clear();
}

/** Lazily create the module worker; returns null when workers are unsupported. */
function getWorker(): Worker | null {
  if (workerUnavailable) return null;
  if (worker) return worker;
  try {
    worker = new Worker(
      new URL("./workers/HelixEmbedding.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.onmessage = handleMessage as (event: MessageEvent) => void;
    worker.onerror = (event) => {
      console.error("[HelixEmbedding] Local worker failed:", event.message);
      workerUnavailable = true;
      worker = null;
      failAllPending(new Error(event.message || "Local embedding worker failed."));
    };
    return worker;
  } catch (err) {
    console.warn(
      "[HelixEmbedding] Web Worker unavailable — using the main thread.",
      err,
    );
    workerUnavailable = true;
    return null;
  }
}

/** Embed one batch through the worker (rejects when the worker dies mid-flight). */
function embedWithWorker(
  activeWorker: Worker,
  batch: string[],
  model: string,
  onProgress?: HelixEmbeddingProgress,
): Promise<number[][]> {
  const id = `helix-embed-${++requestSeq}`;
  return new Promise<number[][]>((resolve, reject) => {
    pending.set(id, { model, resolve, reject, onProgress, lastPercent: 0 });
    activeWorker.postMessage({ id, model, inputs: batch });
  });
}

// ── Main-thread fallback ──────────────────────────────────────────────────────
// Used only when the browser cannot start the module worker. Keeps the feature
// working at the cost of possible UI jank during bulk indexing.

const mainThreadPipelines = new Map<
  string,
  Promise<FeatureExtractionPipeline>
>();

/** Load (and cache) a pipeline on the main thread. */
function getMainThreadPipeline(
  model: string,
  onProgress?: HelixEmbeddingProgress,
): Promise<FeatureExtractionPipeline> {
  let cached = mainThreadPipelines.get(model);
  if (!cached) {
    cached = import("@huggingface/transformers").then(
      async ({ env, pipeline }) => {
        env.allowLocalModels = false;
        env.useBrowserCache = true;
        onProgress?.(describeProgress());
        return pipeline("feature-extraction", model);
      },
    );
    mainThreadPipelines.set(model, cached);
  }
  return cached;
}

/** Embed one batch on the main thread. */
async function embedOnMainThread(
  batch: string[],
  model: string,
  onProgress?: HelixEmbeddingProgress,
): Promise<number[][]> {
  const extractor = await getMainThreadPipeline(model, onProgress);
  const output = await extractor(batch, { pooling: "mean", normalize: true });
  return output.tolist() as number[][];
}

/** Route a batch to the worker, falling back to the main thread when needed. */
async function embedBatch(
  batch: string[],
  model: string,
  onProgress?: HelixEmbeddingProgress,
): Promise<number[][]> {
  const activeWorker = getWorker();
  if (!activeWorker) return embedOnMainThread(batch, model, onProgress);
  try {
    return await embedWithWorker(activeWorker, batch, model, onProgress);
  } catch (err) {
    if (workerUnavailable) return embedOnMainThread(batch, model, onProgress);
    throw err;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Embed one or more texts locally with Transformers.js, batching the inputs and
 * awaiting the worker by request id. Documents and queries must both come
 * through here (queries pass `isQuery`) so their vectors stay comparable.
 */
export async function embedTextsLocal(
  inputs: string[],
  options: HelixLocalEmbeddingOptions = {},
): Promise<number[][]> {
  if (inputs.length === 0) return [];
  const model = options.model || DEFAULT_TRANSFORMERS_EMBEDDING_MODEL;
  const prepared = prepareInputs(inputs, model, options.isQuery ?? false);
  const vectors: number[][] = [];
  for (let i = 0; i < prepared.length; i += BATCH_SIZE) {
    const batch = prepared.slice(i, i + BATCH_SIZE);
    vectors.push(...(await embedBatch(batch, model, options.onProgress)));
  }
  return vectors;
}

/** Convenience wrapper for a single text input (used by RAG query retrieval). */
export async function embedTextLocal(
  input: string,
  options: HelixLocalEmbeddingOptions = {},
): Promise<number[]> {
  const vectors = await embedTextsLocal([input], options);
  return vectors[0] ?? [];
}
