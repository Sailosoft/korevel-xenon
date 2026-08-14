// BSSpeechGenerator.Types — Types for the Bunny AI Studio Speech Generator.
//
// A Speech Asset is a single AI-generated audio (text-to-speech) persisted to
// the local `speechLibrary` IndexedDB table (Dexie via PhazeDB). The audio is
// stored as a base64 data URL so it works fully offline and can be played or
// downloaded directly from the library without re-hitting the provider.

import type { HelixAIProvider } from "@/src/modules/helix";
import type {
  HelixSpeechResponseFormat,
  HelixSpeechSampleRate,
} from "@/src/modules/helix";

/** A single generated speech audio saved to the library. */
export interface BSSpeechAsset {
  /** uuidv7 primary key */
  id: string;
  /** The text that was spoken */
  input: string;
  /** Helix speech provider used (e.g. "siliconFlow") */
  provider: HelixAIProvider;
  /** Speech model id used (e.g. "fishaudio/fish-speech-1.5") */
  model: string;
  /**
   * Voice used — a built-in `"<model>:<voice>"` (e.g.
   * "fishaudio/fish-speech-1.5:alex") or a user-defined `"speech:..."` URI.
   * Empty when the model uses its default voice.
   */
  voice: string;
  /** Base64 data URL of the generated audio (data:audio/...;base64,...) */
  url: string;
  /** Audio output format (e.g. "mp3") */
  format: HelixSpeechResponseFormat;
  /** Output sample rate (0 when unspecified/unknown) */
  sampleRate: number;
  /** Duration of the audio in seconds (fractional). 0 when unknown. */
  duration: number;
  /** ISO-8601 timestamp of when the audio was generated */
  createdDate: string;
}

/** Form shape used when persisting a newly generated audio (id generated on create). */
export type BSSpeechAssetForm = Omit<BSSpeechAsset, "id">;

/** Supported audio output formats offered by the generator UI. */
export const BS_SPEECH_FORMATS: readonly HelixSpeechResponseFormat[] = [
  "mp3",
  "opus",
  "wav",
  "pcm",
];
export type BSSpeechFormat = HelixSpeechResponseFormat;

/** Supported output sample rates offered by the generator UI. */
export const BS_SPEECH_SAMPLE_RATES: readonly HelixSpeechSampleRate[] = [
  8000, 16000, 24000, 32000, 44100, 48000,
];
export type BSSpeechSampleRate = HelixSpeechSampleRate;
