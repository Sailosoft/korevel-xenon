/**
 * Helix — AI Configuration Hub
 *
 * All AI configuration types, provider data, model lists, AI schema, and
 * AI services are consolidated here. Modules subscribe to Helix for their
 * AI needs rather than defining their own.
 */

// ── Config types & data ────────────────────────────────────────────────────────
export type {
  HelixAIProvider,
  HelixTemperaturePreset,
  HelixAIOption,
  HelixAIProviderConfig,
  HelixAIConfig,
  HelixConfig,
} from "./src/HelixConfig";
export {
  HELIX_AI_PROVIDERS,
  HELIX_PROVIDER_LABELS,
  isHelixProvider,
  HELIX_AI_MODELS,
  HELIX_NON_SUPPORTED_JSON_OBJECT_PROVIDER,
  HELIX_STT_MODELS,
  HELIX_STT_PROVIDERS,
} from "./src/HelixConfig";

// ── Image model library ────────────────────────────────────────────────────────
// Reuses HelixConfig provider identity/config; only the model collections
// are defined separately.
export type { HelixImageProvider } from "./src/HelixConfig.Image";
export {
  HELIX_PROVIDER_IMAGE_MODELS,
  HELIX_IMAGE_MODELS,
  isHelixImageProvider,
} from "./src/HelixConfig.Image";

// ── AI Schema types & service ──────────────────────────────────────────────────
export type {
  HelixStrictPropertyDefinition,
  HelixAISchemaProperties,
  HelixAISchemaOptions,
  HelixAISchema,
  HelixInferSchemaProps,
} from "./src/HelixAISchemaTypes";
export { default as HelixAISchemaService } from "./src/HelixAISchemaService";

// ── AI Service interface & implementation ──────────────────────────────────────
export type { HelixAIServiceType } from "./src/HelixAIServiceInterface";
export { default as HelixAIService } from "./src/HelixAIService";

// ── AI Settings Types ───────────────────────────────────────────────────────────
export type { HelixAISettings } from "./src/HelixAITypes";

// ── Components ────────────────────────────────────────────────────────────────────
export { HelixAIProviderSelector } from "./src/components/HelixAIProviderSelector";
export type { HelixAIProviderSelectorProps } from "./src/components/HelixAIProviderSelector";

// ── Image AI Components ────────────────────────────────────────────────────────────
export { HelixAIImageProviderSelector } from "./src/components/HelixAIImageProviderSelector";
export type {
  HelixAIImageProviderSelectorProps,
} from "./src/components/HelixAIImageProviderSelector";
export { default as HelixAIImageModal } from "./src/components/HelixAIImageModal";
export type { HelixAIImageModalProps } from "./src/components/HelixAIImageModal";

// ── Hooks ───────────────────────────────────────────────────────────────────────────────
export { useHelixAISettings, useHelixAIOption } from "./src/hooks/useHelixAISettings";
export type {
  UseHelixAISettingsOptions,
  UseHelixAISettingsReturn,
} from "./src/hooks/useHelixAISettings";

// ── Image AI Hooks ─────────────────────────────────────────────────────────────────────
export {
  useHelixAIImageSettings,
  useHelixAIImageOption,
} from "./src/hooks/useHelixAIImageSettings";
export type {
  UseHelixAIImageSettingsOptions,
  UseHelixAIImageSettingsReturn,
} from "./src/hooks/useHelixAIImageSettings";
