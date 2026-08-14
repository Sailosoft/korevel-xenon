// BSVideoGenerator.Types — Types for the Bunny AI Studio Video Generator.
//
// A Video Asset is a single AI-generated video persisted to the local
// `videoLibrary` IndexedDB table (Dexie via PhazeDB). The video itself is
// stored as a base64 data URL so it works fully offline and can be played or
// downloaded directly from the library without re-hitting the provider
// (SiliconFlow result URLs are only valid for ~10 minutes, so persisting the
// blob is what makes the library durable).

import type { HelixAIProvider } from "@/src/modules/helix";

/** A single generated video saved to the library. */
export interface BSVideoAsset {
  /** uuidv7 primary key */
  id: string;
  /** The prompt that produced this video */
  prompt: string;
  /** Helix video provider used (e.g. "siliconFlow") */
  provider: HelixAIProvider;
  /** Video model id used (e.g. "Wan-AI/Wan2.2-T2V-A14B") */
  model: string;
  /** Base64 data URL of the generated video (data:video/...;base64,...) */
  url: string;
  /** Requested video size (e.g. "1280x720") */
  size: string;
  /** Duration of the generated video in seconds (fractional). 0 when unknown. */
  duration: number;
  /** ISO-8601 timestamp of when the video was generated */
  createdDate: string;
}

/** Form shape used when persisting a newly generated video (id generated on create). */
export type BSVideoAssetForm = Omit<BSVideoAsset, "id">;

/** Supported aspect-ratio / size presets offered by the generator UI. */
export const BS_VIDEO_SIZES = ["1280x720", "720x1280", "960x960"] as const;
export type BSVideoSize = (typeof BS_VIDEO_SIZES)[number];
