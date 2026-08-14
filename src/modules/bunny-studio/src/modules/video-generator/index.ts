// video-generator module — public exports

export { BSVideoGeneratorComponent } from "./BSVideoGenerator.Component";
export { BSVideoLibrary } from "./BSVideoLibrary.Component";
export { BSVideoCard, downloadDataUrl, formatDuration } from "./BSVideoCard";
export type { BSVideoCardProps } from "./BSVideoCard";
export { BSVideoPreviewModal } from "./BSVideoPreviewModal";
export type { BSVideoPreviewModalProps } from "./BSVideoPreviewModal";
export { useBSVideoGenerator } from "./BSVideoGenerator.Hooks";
export type {
  BSGenerateVideoOptions,
  BSGeneratedVideo,
  BSGenerateVideoResult,
  BSVideoGenerationState,
  BSVideoGenerationStatus,
} from "./BSVideoGenerator.Hooks";
export { BSVideoRepository } from "./BSVideoGenerator.Repository";
export type {
  BSVideoAsset,
  BSVideoAssetForm,
  BSVideoSize,
} from "./BSVideoGenerator.Types";
export { BS_VIDEO_SIZES } from "./BSVideoGenerator.Types";
