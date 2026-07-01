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
} from "./src/HelixConfig";

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

// ── Hooks ───────────────────────────────────────────────────────────────────────────────
export { useHelixAISettings, useHelixAIOption } from "./src/hooks/useHelixAISettings";
export type {
  UseHelixAISettingsOptions,
  UseHelixAISettingsReturn,
} from "./src/hooks/useHelixAISettings";
