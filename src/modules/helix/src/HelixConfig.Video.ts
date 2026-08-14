/**
 * ───────────────────────────────────────────────────────────────────────────────
 * Helix — Video Generation Model Library
 * ───────────────────────────────────────────────────────────────────────────────
 * The only video-generation-specific data lives here: the model collections per
 * provider. Provider identity, API keys, and endpoints are reused from
 * HelixConfig.ts (HelixAIProvider / HELIX_AI_PROVIDERS) — no duplicated config.
 *
 * For now only SiliconFlow is supported for video generation; more providers
 * can be added here as they gain video endpoints.
 */

import type { HelixAIProvider } from "./HelixConfig";

// ── Provider identity ─────────────────────────────────────────────────────────
// Reuses the shared HelixAIProvider union. Video generation currently supports
// only "siliconFlow" — the type narrows the union to video-capable providers.

/** Providers that currently support video generation via Helix. */
export type HelixVideoProvider = Extract<HelixAIProvider, "siliconFlow">;

// ── Provider-specific video model lists ───────────────────────────────────────
// Add or remove video models here per provider. The "default" key is
// auto-computed by merging all other providers — no manual duplication needed.
// For now only SiliconFlow is populated; other providers remain unsupported.

export const HELIX_PROVIDER_VIDEO_MODELS: Partial<
  Record<Exclude<HelixAIProvider, "default">, readonly string[]>
> = {
  siliconFlow: [
    // Wan-AI — Image-to-Video (requires a base64 image data URL)
    "Wan-AI/Wan2.2-I2V-A14B",
    // Wan-AI — Text-to-Video (prompt only)
    "Wan-AI/Wan2.2-T2V-A14B",
  ] as const,
};

// ── Default: auto-merge all video models (deduplicated) ───────────────────────
// Dynamically aggregates every video model from all other providers into one
// flat list. Duplicates across providers are removed so the "default" list is
// clean. Providers without video support contribute nothing.

const ALL_VIDEO_PROVIDER_MODELS = Object.values(
  HELIX_PROVIDER_VIDEO_MODELS,
).flat();
const UNIQUE_DEFAULT_VIDEO_MODELS = Array.from(
  new Set(["default", ...ALL_VIDEO_PROVIDER_MODELS]),
).sort();

export const HELIX_VIDEO_MODELS: Partial<
  Record<HelixAIProvider, readonly string[]>
> = {
  default: UNIQUE_DEFAULT_VIDEO_MODELS,
  ...HELIX_PROVIDER_VIDEO_MODELS,
};

// ── Supported video size presets ──────────────────────────────────────────────
// Length-width ratio of the generated video. Mirrors the SiliconFlow
// `/video/submit` schema (1280x720 landscape, 720x1280 portrait, 960x960 square).

export const HELIX_VIDEO_SIZES = ["1280x720", "720x1280", "960x960"] as const;
export type HelixVideoSize = (typeof HELIX_VIDEO_SIZES)[number];

// ── Type guard ────────────────────────────────────────────────────────────────

/** Checks whether an arbitrary string is a supported video-generation provider */
export function isHelixVideoProvider(
  value: string,
): value is HelixVideoProvider {
  return (
    Object.keys(HELIX_PROVIDER_VIDEO_MODELS) as HelixAIProvider[]
  ).includes(value as HelixAIProvider);
}
