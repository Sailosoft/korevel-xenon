// HelixEmbedding.worker — local Transformers.js feature-extraction worker.
//
// Runs the browser-side ONNX embedding models off the main thread so bulk
// indexing never blocks the UI. The client (HelixEmbedding.Transformers.ts)
// posts { id, model, inputs } requests and receives { id, vectors } results,
// plus { model, status, progress } events while a model is being loaded.

import { env, pipeline } from "@huggingface/transformers";
import type { FeatureExtractionPipeline } from "@huggingface/transformers";

// Models come from the Hugging Face hub and are cached by the library; no
// local model files are bundled with the app.
env.allowLocalModels = false;
env.useBrowserCache = true;

interface HelixEmbeddingWorkerRequest {
  id: string;
  model: string;
  inputs: string[];
}

/** Loaded pipelines, one promise per model id (kept for the worker's lifetime). */
const pipelines = new Map<string, Promise<FeatureExtractionPipeline>>();

/** Post a message back to the client (worker global scope). */
function post(message: unknown): void {
  (self as unknown as { postMessage: (value: unknown) => void }).postMessage(
    message,
  );
}

/** Load a pipeline for a model, reporting download progress to the client. */
function getPipeline(model: string): Promise<FeatureExtractionPipeline> {
  let cached = pipelines.get(model);
  if (!cached) {
    cached = pipeline("feature-extraction", model, {
      progress_callback: (info) => {
        post({
          type: "progress",
          model,
          status: info.status,
          progress: "progress" in info ? info.progress : undefined,
        });
      },
    });
    pipelines.set(model, cached);
  }
  return cached;
}

/** Embed one batch with mean pooling + normalization (bge / MiniLM convention). */
async function embed(request: HelixEmbeddingWorkerRequest): Promise<void> {
  try {
    const extractor = await getPipeline(request.model);
    const output = await extractor(request.inputs, {
      pooling: "mean",
      normalize: true,
    });
    post({ id: request.id, type: "result", vectors: output.tolist() });
  } catch (err) {
    post({
      id: request.id,
      type: "error",
      error: err instanceof Error ? err.message : "Local embedding failed.",
    });
  }
}

self.addEventListener("message", (event) => {
  const request = (event as MessageEvent<HelixEmbeddingWorkerRequest>).data;
  if (!request || typeof request.id !== "string") return;
  void embed(request);
});
