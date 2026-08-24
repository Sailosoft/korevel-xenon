/**
 * ───────────────────────────────────────────────────────────────────────────────
 * Helix — Speech (TTS) & Transcription (STT) Model Library
 * ───────────────────────────────────────────────────────────────────────────────
 * The only speech-specific data lives here: the speech (text-to-speech) model
 * collections per provider, the per-model voice lists, and the supported audio
 * output formats/sample rates. Transcription (STT) model lists are also kept
 * here for a single "speech" config home — the canonical `HELIX_STT_MODELS`
 * (used by the chat mic + transcribe route) is kept in sync from this file.
 *
 * Provider identity, API keys, and endpoints are reused from HelixConfig.ts
 * (HelixAIProvider / HELIX_AI_PROVIDERS) — no duplicated config.
 *
 * For now SiliconFlow and DeepInfra are supported for speech generation; more
 * providers can be added here as they gain speech endpoints. Reference:
 * src/modules/bunny-studio/docs/Feature/AudioSubmit.md
 */

import type { HelixAIProvider } from "./HelixConfig";

// ── Provider identity ─────────────────────────────────────────────────────────
// Reuses the shared HelixAIProvider union. Speech generation currently supports
// "siliconFlow" and "deepinfra" — the type narrows the union to speech-capable
// providers.

/** Providers that currently support speech (TTS) generation via Helix. */
export type HelixSpeechProvider = Extract<
  HelixAIProvider,
  "siliconFlow" | "deepinfra"
>;

// ── Provider-specific speech (TTS) model lists ────────────────────────────────
// Add or remove speech models here per provider. The "default" key is
// auto-computed by merging all other providers — no manual duplication needed.
// For now SiliconFlow and DeepInfra are populated; other providers remain
// unsupported.

export const HELIX_PROVIDER_SPEECH_MODELS: Partial<
  Record<Exclude<HelixAIProvider, "default">, readonly string[]>
> = {
  siliconFlow: [
    // IndexTeam — lightweight, fast neural TTS
    "IndexTeam/IndexTTS-2",
    // Fish Audio — named-voice TTS (requires a voice)
    "fishaudio/fish-speech-1.5",
    // FunAudioLLM — voice / reference-based TTS
    "FunAudioLLM/CosyVoice2-0.5B",
  ] as const,

  // DeepInfra — OpenAI-compatible TTS endpoint
  deepinfra: [
    // Audio8 — lightweight preview TTS
    "Audio8/Audio8-TTS-Preview-0.6b",
  ] as const,
};

// ── Default: auto-merge all speech models (deduplicated) ──────────────────────
// Dynamically aggregates every speech model from all other providers into one
// flat list. Duplicates across providers are removed so the "default" list is
// clean. Providers without speech support contribute nothing.

const ALL_SPEECH_PROVIDER_MODELS = Object.values(
  HELIX_PROVIDER_SPEECH_MODELS,
).flat();
const UNIQUE_DEFAULT_SPEECH_MODELS = Array.from(
  new Set(["default", ...ALL_SPEECH_PROVIDER_MODELS]),
).sort();

export const HELIX_SPEECH_MODELS: Partial<
  Record<HelixAIProvider, readonly string[]>
> = {
  default: UNIQUE_DEFAULT_SPEECH_MODELS,
  ...HELIX_PROVIDER_SPEECH_MODELS,
};

// ── Predefined voices per speech model ────────────────────────────────────────
// Built-in voices exposed by each provider's `/audio/speech` schema. Keyed by
// model id, values are the voice names (the part after "model:" in the request).
// These mirror the enums from the SiliconFlow AudioSubmit reference doc. The
// adapter/route builds the final voice string as `${model}:${voice}`. Users can
// additionally load their own custom voices via the `/audio/voice/list` API.

export const HELIX_PROVIDER_SPEECH_VOICES: Partial<
  Record<
    Exclude<HelixAIProvider, "default">,
    Partial<Record<string, readonly string[]>>
  >
> = {
  siliconFlow: {
    "IndexTeam/IndexTTS-2": [
      "alex",
      "anna",
      "bella",
      "benjamin",
      "charles",
      "claire",
      "david",
      "diana",
    ] as const,
    "fishaudio/fish-speech-1.5": [
      "alex",
      "anna",
      "bella",
      "benjamin",
      "charles",
      "claire",
      "david",
      "diana",
    ] as const,
    "FunAudioLLM/CosyVoice2-0.5B": [
      "alex",
      "anna",
      "bella",
      "benjamin",
      "charles",
      "claire",
      "david",
      "diana",
    ] as const,
  },
};

// ── Default: merge voices keyed by model id (deduplicated per model) ──────────
// Flat lookup so consumers can ask "what voices does <model> support?" without
// knowing the provider that owns it.

export const HELIX_SPEECH_VOICES: Record<string, readonly string[]> = {};
for (const providerVoices of Object.values(HELIX_PROVIDER_SPEECH_VOICES)) {
  for (const [model, modelVoices] of Object.entries(providerVoices)) {
    if (modelVoices) HELIX_SPEECH_VOICES[model] = modelVoices;
  }
}

/** Resolve the built-in voices for a given speech model id (empty when unknown). */
export function getHelixSpeechVoices(model: string): readonly string[] {
  return HELIX_SPEECH_VOICES[model] ?? [];
}

// ── Supported audio output formats ────────────────────────────────────────────
// Mirrors the SiliconFlow `/audio/speech` response_format enum. "pcm" output
// has no browser-playable MIME, so the app always requests mp3/opus/wav for
// in-app playback and download.

export const HELIX_SPEECH_RESPONSE_FORMATS = [
  "mp3",
  "opus",
  "wav",
  "pcm",
] as const;
export type HelixSpeechResponseFormat =
  (typeof HELIX_SPEECH_RESPONSE_FORMATS)[number];

// ── Supported sample rates ────────────────────────────────────────────────────
// Mirrors the SiliconFlow `/audio/speech` sample_rate enum. Note not every
// format accepts every rate (wav/pcm: 8k-44.1k, mp3: 32k/44.1k, opus: 48k).

export const HELIX_SPEECH_SAMPLE_RATES = [
  8000, 16000, 24000, 32000, 44100, 48000,
] as const;
export type HelixSpeechSampleRate = (typeof HELIX_SPEECH_SAMPLE_RATES)[number];

// ── Provider-specific transcription (STT) model lists ─────────────────────────
// Same speech models used for speech-to-text. Kept here so HelixConfig.Speech
// is the single speech config home; HELIX_STT_MODELS (chat mic / transcribe
// route) is kept in sync manually from these lists.

export const HELIX_PROVIDER_TRANSCRIPTION_MODELS: Partial<
  Record<Exclude<HelixAIProvider, "default">, readonly string[]>
> = {
  siliconFlow: [
    // Qwen3-Omni — fast multimodal audio → text completion.
    "Qwen/Qwen3-Omni-30B-A3B-Instruct",
    // Qwen3-Omni — higher reasoning accuracy for speech understanding.
    "Qwen/Qwen3-Omni-30B-A3B-Thinking",
  ] as const,
};

/**
 * Omni (multimodal) models that transcribe audio via `/chat/completions` using
 * base64 `input_audio` content parts, rather than the native
 * `/audio/transcriptions` endpoint. SiliconFlow has rotated its standalone ASR
 * models (e.g. FunAudioLLM/SenseVoiceSmall, TeleAI/TeleSpeechASR) offline and
 * now routes speech processing through these Omni models.
 */
export const HELIX_OMNI_TRANSCRIPTION_MODELS: readonly string[] = [
  "Qwen/Qwen3-Omni-30B-A3B-Instruct",
  "Qwen/Qwen3-Omni-30B-A3B-Thinking",
] as const;

/** Whether the given transcription model transcribes via chat-completions audio input. */
export function isOmniTranscriptionModel(model: string): boolean {
  return HELIX_OMNI_TRANSCRIPTION_MODELS.includes(model);
}

const ALL_TRANSCRIPTION_PROVIDER_MODELS = Object.values(
  HELIX_PROVIDER_TRANSCRIPTION_MODELS,
).flat();
const UNIQUE_DEFAULT_TRANSCRIPTION_MODELS = Array.from(
  new Set(["default", ...ALL_TRANSCRIPTION_PROVIDER_MODELS]),
).sort();

export const HELIX_TRANSCRIPTION_MODELS: Partial<
  Record<HelixAIProvider, readonly string[]>
> = {
  default: UNIQUE_DEFAULT_TRANSCRIPTION_MODELS,
  ...HELIX_PROVIDER_TRANSCRIPTION_MODELS,
};

// ── Type guard ────────────────────────────────────────────────────────────────

/** Checks whether an arbitrary string is a supported speech-generation provider */
export function isHelixSpeechProvider(
  value: string,
): value is HelixSpeechProvider {
  return (
    Object.keys(HELIX_PROVIDER_SPEECH_MODELS) as HelixAIProvider[]
  ).includes(value as HelixAIProvider);
}
