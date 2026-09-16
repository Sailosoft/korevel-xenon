// BSEmbeddingModelPicker — Knowledge Group embedding model field.
//
// Renders the embedding models scoped to the engine currently selected in the
// form (`formData.embeddingEngine`), and keeps the stored model (plus its
// vector dimension) in sync whenever the engine changes or the current model
// does not belong to the selected engine.

"use client";

import { useEffect } from "react";
import {
  DEFAULT_EMBEDDING_ENGINE,
  getEmbeddingModelDimensions,
  getEmbeddingModelsForEngine,
  getProviderDefaultEmbeddingModelForEngine,
  HELIX_EMBEDDING_ENGINE_LABELS,
  isHelixEmbeddingEngine,
  type HelixEmbeddingEngine,
} from "@/src/modules/helix";
import type { BunnyFieldRendererProps } from "@/src/modules/bunny/src/form/BunnyForm.Interface";

/** Resolve the engine selected in the form (default: local Transformers.js). */
function resolveEngine(formData: Record<string, unknown>): HelixEmbeddingEngine {
  const raw = formData.embeddingEngine;
  return typeof raw === "string" && isHelixEmbeddingEngine(raw)
    ? raw
    : DEFAULT_EMBEDDING_ENGINE;
}

export function BSEmbeddingModelPicker(props: BunnyFieldRendererProps) {
  const { value, onChange, formData, error } = props;
  const engine = resolveEngine(formData);
  const models = getEmbeddingModelsForEngine(engine);
  const fallback = getProviderDefaultEmbeddingModelForEngine(engine);
  const current = typeof value === "string" ? value : "";
  const safeValue = models.includes(current) ? current : fallback;
  const dimensions = getEmbeddingModelDimensions(safeValue);

  // Keep the model (and its dimension) valid for the selected engine — a model
  // from another engine would produce vectors the group's index cannot hold.
  useEffect(() => {
    if (current !== safeValue) {
      onChange("embeddingModel", safeValue);
    }
    if (formData.embeddingDimensions !== dimensions) {
      onChange("embeddingDimensions", dimensions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, safeValue, dimensions, formData.embeddingDimensions]);

  return (
    <div className="flex flex-col gap-1 w-full">
      <select
        value={safeValue}
        onChange={(e) => onChange("embeddingModel", e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white"
      >
        {models.map((model) => (
          <option key={model} value={model}>
            {model}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <p className="text-[10px] text-gray-400">
        {HELIX_EMBEDDING_ENGINE_LABELS[engine]} · {dimensions} dimensions
        {engine === "transformers"
          ? " · runs locally, first use downloads the model"
          : ""}
      </p>
    </div>
  );
}

export default BSEmbeddingModelPicker;
