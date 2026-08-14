// BSTranscription.Types — Types for the Bunny AI Studio Transcription module.
//
// A Transcription Asset is a single audio → text result persisted to the local
// `transcriptionLibrary` IndexedDB table (Dexie via PhazeDB). The source audio
// is stored (optionally) as a base64 data URL so it can be re-listened to
// offline, alongside the resulting transcript text.

import type { HelixAIProvider } from "@/src/modules/helix";

/** A single transcription saved to the library. */
export interface BSTranscriptionAsset {
  /** uuidv7 primary key */
  id: string;
  /** Source audio file name */
  fileName: string;
  /** Helix provider used (e.g. "siliconFlow") */
  provider: HelixAIProvider;
  /** Transcription (STT) model id used (e.g. "FunAudioLLM/SenseVoiceSmall") */
  model: string;
  /** Optional BCP-47 language hint used (e.g. "en", "zh") */
  language: string;
  /** The transcribed text */
  text: string;
  /** Optional base64 data URL of the source audio (persisted for re-listening) */
  url?: string;
  /** Duration of the source audio in seconds (fractional). 0 when unknown. */
  duration: number;
  /** ISO-8601 timestamp of when the transcription was created */
  createdDate: string;
}

/** Form shape used when persisting a new transcription (id generated on create). */
export type BSTranscriptionAssetForm = Omit<BSTranscriptionAsset, "id">;
