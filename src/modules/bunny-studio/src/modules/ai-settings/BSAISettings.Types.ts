// BSAISettings.Types — AI configuration settings for Bunny AI Studio.
//
// Stores the user's preferred AI provider + model pair (global settings),
// which is passed as HelixAIOption to AI calls. Individual chats, agents,
// and inputs may override the global setting (least → most priority).
//
// Also stores speech-to-text (STT) settings so the chat mic can use either the
// builtin browser Web Speech API or an AI-based (OpenAI-compatible) transcriber.

import type { HelixAIProvider } from "@/src/modules/helix";

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

/** The settings shape persisted in the aiSettings Dexie table. */
export interface BSAISettings {
  /** The selected AI provider key */
  provider: HelixAIProvider;
  /** The selected model identifier for that provider */
  model: string;
  /** Speech-to-text settings (optional for backward compatibility) */
  speech?: BSSpeechSettings;
}

/** Default AI settings — used when nothing has been saved yet. */
export const BS_AI_SETTINGS_DEFAULTS: BSAISettings = {
  provider: "default",
  model: "gemma4:31b-cloud",
};

/** Default speech-to-text settings — browser STT out of the box. */
export const BS_SPEECH_SETTINGS_DEFAULTS: BSSpeechSettings = {
  sttMode: "browser",
  sttProvider: "openai",
  sttModel: "whisper-1",
  sttLanguage: "",
  sttEndpoint: "",
};
