/**
 * ───────────────────────────────────────────────────────────────────────────────
 * Helix — Image Generation Model Library
 * ───────────────────────────────────────────────────────────────────────────────
 * The only image-generation-specific data lives here: the model collections per
 * provider. Provider identity, API keys, and endpoints are reused from
 * HelixConfig.ts (HelixAIProvider / HELIX_AI_PROVIDERS) — no duplicated config.
 *
 * For now SiliconFlow, DeepInfra, and Google AI Studio are supported for image
 * generation; more providers can be added here as they gain image endpoints.
 */

import type { HelixAIProvider } from "./HelixConfig";

// ── Provider identity ─────────────────────────────────────────────────────────
// Reuses the shared HelixAIProvider union. Image generation currently supports
// "siliconFlow", "deepinfra", and "googleAIStudio" — the type narrows the union
// to image-capable providers.

/** Providers that currently support image generation via Helix. */
export type HelixImageProvider = Extract<
  HelixAIProvider,
  "siliconFlow" | "deepinfra" | "googleAIStudio"
>;

// ── Provider-specific image model lists ───────────────────────────────────────
// Add or remove image models here per provider. The "default" key is
// auto-computed by merging all other providers — no manual duplication needed.
// For now SiliconFlow, DeepInfra, and Google AI Studio are populated; other
// providers remain unsupported.

export const HELIX_PROVIDER_IMAGE_MODELS: Partial<
  Record<Exclude<HelixAIProvider, "default">, readonly string[]>
> = {
  siliconFlow: [
    // Tongyi-MAI (Alibaba) — lightweight, fast Z-Image
    "Tongyi-MAI/Z-Image-Turbo",

    // Black Forest Labs — FLUX.2 generation
    "black-forest-labs/FLUX.2-flex",
    "black-forest-labs/FLUX.2-pro",
  ] as const,

  // DeepInfra — OpenAI-compatible image endpoints
  deepinfra: [
    // Black Forest Labs — FLUX.2 klein (compact) text-to-image
    "black-forest-labs/FLUX-2-klein-4b",
    "black-forest-labs/FLUX-2-klein-9b",
    // Black Forest Labs — FLUX.2 dev (open weights)
    "black-forest-labs/FLUX-2-dev",
    // Bria — image generation
    "Bria/Bria-3.2",
    "Bria/Bria-3.2-vector",
    // ByteDance — Seedream text-to-image
    "ByteDance/Seedream-4",
    "ByteDance/Seedream-4.5",
    // DeepSeek — Janus-Pro multimodal text-to-image
    "deepseek-ai/Janus-Pro-7B",
  ] as const,

  // Google AI Studio — Gemini image generation endpoints
  googleAIStudio: [
    // Gemini 3.1 generation — image models
    "gemini-3.1-flash-image",
    "gemini-3.1-flash-lite-image",
    "gemini-3-pro-image",
  ] as const,
};

// ── Default: auto-merge all image models (deduplicated) ───────────────────────
// Dynamically aggregates every image model from all other providers into one
// flat list. Duplicates across providers are removed so the "default" list is
// clean. Providers without image support contribute nothing.

const ALL_IMAGE_PROVIDER_MODELS = Object.values(
  HELIX_PROVIDER_IMAGE_MODELS,
).flat();
const UNIQUE_DEFAULT_IMAGE_MODELS = Array.from(
  new Set(["default", ...ALL_IMAGE_PROVIDER_MODELS]),
).sort();

export const HELIX_IMAGE_MODELS: Partial<
  Record<HelixAIProvider, readonly string[]>
> = {
  default: UNIQUE_DEFAULT_IMAGE_MODELS,
  ...HELIX_PROVIDER_IMAGE_MODELS,
};

// ── Type guard ────────────────────────────────────────────────────────────────

/** Checks whether an arbitrary string is a supported image-generation provider */
export function isHelixImageProvider(
  value: string,
): value is HelixImageProvider {
  return (
    Object.keys(HELIX_PROVIDER_IMAGE_MODELS) as HelixAIProvider[]
  ).includes(value as HelixAIProvider);
}
