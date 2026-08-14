// BSAISettings.Types — AI configuration settings for Bunny AI Studio.
//
// Stores the user's preferred AI provider + model pair (global settings),
// which is passed as HelixAIOption to AI calls. Individual chats, agents,
// and inputs may override the global setting (least → most priority).
//
// Also stores speech-to-text (STT) settings so the chat mic can use either the
// builtin browser Web Speech API or an AI-based (OpenAI-compatible) transcriber.

import type { HelixAIProvider } from "@/src/modules/helix";
import {
  HELIX_PROVIDER_IMAGE_MODELS,
  HELIX_IMAGE_MODELS,
} from "@/src/modules/helix";
import {
  HELIX_PROVIDER_VIDEO_MODELS,
  HELIX_VIDEO_MODELS,
} from "@/src/modules/helix";

/** Fixed ID for the singleton global AI settings record. */
export const BS_AI_SETTINGS_ID = "global";

/** Which speech engine the chat mic uses. */
export type BSSttMode = "browser" | "ai";

/** Speech-to-text settings persisted alongside the global AI settings. */
export interface BSSpeechSettings {
  /** "browser" = builtin Web Speech API (on-device), "ai" = server transcription */
  sttMode: BSSttMode;
  /** Helix provider used for AI-based transcription */
  sttProvider: HelixAIProvider;
  /** STT model id for the selected provider (e.g. "whisper-1") */
  sttModel: string;
  /** Optional BCP-47 language hint (e.g. "en", "en-US") */
  sttLanguage: string;
  /** Optional STT base URL override (e.g. Ollama Cloud serves STT elsewhere) */
  sttEndpoint: string;
}

/** Image-generation AI settings (provider + model used by the Image Generator). */
export interface BSAIImageSettings {
  /** The selected image AI provider key (e.g. "siliconFlow") */
  provider: HelixAIProvider;
  /** The selected image model identifier for that provider */
  model: string;
}

/** Video-generation AI settings (provider + model used by the Video Generator). */
export interface BSVideoSettings {
  /** The selected video AI provider key (e.g. "siliconFlow") */
  provider: HelixAIProvider;
  /** The selected video model identifier for that provider */
  model: string;
}

/** The settings shape persisted in the aiSettings Dexie table. */
export interface BSAISettings {
  /** The selected AI provider key */
  provider: HelixAIProvider;
  /** The selected model identifier for that provider */
  model: string;
  /** Speech-to-text settings (optional for backward compatibility) */
  speech?: BSSpeechSettings;
  /** Image-generation AI settings (optional for backward compatibility) */
  image?: BSAIImageSettings;
  /** Video-generation AI settings (optional for backward compatibility) */
  video?: BSVideoSettings;
}

/** Default AI settings — used when nothing has been saved yet. */
export const BS_AI_SETTINGS_DEFAULTS: BSAISettings = {
  provider: "default",
  model: "gemma4:31b-cloud",
};

// Default image settings — first image-capable provider with its first model.
const DEFAULT_IMAGE_PROVIDER = (
  Object.keys(HELIX_PROVIDER_IMAGE_MODELS) as HelixAIProvider[]
).find((p) => p !== "default") ?? "siliconFlow";

export const BS_AI_IMAGE_SETTINGS_DEFAULTS: BSAIImageSettings = {
  provider: DEFAULT_IMAGE_PROVIDER,
  model: HELIX_IMAGE_MODELS[DEFAULT_IMAGE_PROVIDER]?.[0] ?? "",
};

// Default video settings — first video-capable provider with its first model.
const DEFAULT_VIDEO_PROVIDER = (
  Object.keys(HELIX_PROVIDER_VIDEO_MODELS) as HelixAIProvider[]
).find((p) => p !== "default") ?? "siliconFlow";

export const BS_AI_VIDEO_SETTINGS_DEFAULTS: BSVideoSettings = {
  provider: DEFAULT_VIDEO_PROVIDER,
  model: HELIX_VIDEO_MODELS[DEFAULT_VIDEO_PROVIDER]?.[0] ?? "",
};

/** Default speech-to-text settings — browser STT out of the box. */
export const BS_SPEECH_SETTINGS_DEFAULTS: BSSpeechSettings = {
  sttMode: "browser",
  sttProvider: "openai",
  sttModel: "whisper-1",
  sttLanguage: "",
  sttEndpoint: "",
};
