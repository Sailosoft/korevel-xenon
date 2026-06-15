/**
 * Helix — AI Configuration Hub
 *
 * All AI configuration types, provider data, and model lists are consolidated
 * here. Modules subscribe to Helix for their AI configuration needs rather
 * than defining their own.
 */
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
