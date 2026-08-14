// speech-generator module — public exports

export { BSSpeechGeneratorComponent } from "./BSSpeechGenerator.Component";
export { BSSpeechLibrary } from "./BSSpeechLibrary.Component";
export { BSSpeechCard, downloadDataUrl, formatDuration } from "./BSSpeechCard";
export type { BSSpeechCardProps } from "./BSSpeechCard";
export { BSSpeechPreviewModal } from "./BSSpeechPreviewModal";
export type { BSSpeechPreviewModalProps } from "./BSSpeechPreviewModal";
export {
  useBSSpeechGenerator,
  useBSSpeechVoices,
} from "./BSSpeechGenerator.Hooks";
export type {
  BSGenerateSpeechOptions,
  BSGeneratedSpeech,
  BSGenerateSpeechResult,
  BSSpeechGenerationState,
  BSSpeechGenerationStatus,
} from "./BSSpeechGenerator.Hooks";
export { BSSpeechRepository } from "./BSSpeechGenerator.Repository";
export type {
  BSSpeechAsset,
  BSSpeechAssetForm,
  BSSpeechFormat,
  BSSpeechSampleRate,
} from "./BSSpeechGenerator.Types";
export { BS_SPEECH_FORMATS, BS_SPEECH_SAMPLE_RATES } from "./BSSpeechGenerator.Types";
