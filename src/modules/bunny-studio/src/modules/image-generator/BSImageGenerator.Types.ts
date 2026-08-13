// BSImageGenerator.Types — Types for the Bunny AI Studio Image Generator.
//
// An Image Asset is a single AI-generated image persisted to the local
// `imageLibrary` IndexedDB table (Dexie via PhazeDB). The image itself is
// stored as a base64 data URL so it works fully offline and can be downloaded
// directly from the library without re-hitting the provider.

import type { HelixAIProvider } from "@/src/modules/helix";

/** A single generated image saved to the library. */
export interface BSImageAsset {
  /** uuidv7 primary key */
  id: string;
  /** The prompt that produced this image */
  prompt: string;
  /** Helix image provider used (e.g. "siliconFlow") */
  provider: HelixAIProvider;
  /** Image model id used (e.g. "Tongyi-MAI/Z-Image-Turbo") */
  model: string;
  /** Base64 data URL of the generated image (data:image/...;base64,...) */
  url: string;
  /** Requested image size (e.g. "1024x1024") */
  size: string;
  /** ISO-8601 timestamp of when the image was generated */
  createdDate: string;
}

/** Form shape used when persisting a newly generated image (id generated on create). */
export type BSImageAssetForm = Omit<BSImageAsset, "id">;

/** Supported aspect-ratio / size presets offered by the generator UI. */
export const BS_IMAGE_SIZES = ["1024x1024", "768x1024", "1024x768"] as const;
export type BSImageSize = (typeof BS_IMAGE_SIZES)[number];
