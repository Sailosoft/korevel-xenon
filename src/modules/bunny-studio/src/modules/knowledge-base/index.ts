// knowledge-base module — public exports

export { BSKnowledgeGroupComponent } from "./BSKnowledgeGroup.Component";
export { bsKnowledgeGroupModule } from "./BSKnowledgeGroup.Module";
export { BSKnowledgeComponent } from "./BSKnowledge.Component";
export {
  BSKnowledgeGroupRepository,
  BSKnowledgeRepository,
} from "./BSKnowledge.Repository";
export {
  useBSKnowledgeIngest,
  useBSKnowledgeReindex,
  scanWebsite,
  readFileAsText,
  isAllowedResourceFile,
  RESOURCE_FILE_EXTENSIONS,
} from "./BSKnowledge.Hooks";
export { BSEmbeddingModelPicker } from "./BSEmbeddingModelPicker";
export {
  indexKnowledge,
  removeKnowledgeFromIndex,
  searchKnowledgeGroup,
  retrieveKnowledgeContext,
  getGroupIndexCount,
  deleteGroupIndex,
  clearAllGroupIndexes,
  resolveGroupEmbedding,
  KNOWLEDGE_VECTOR_DIMENSION,
} from "./BSKnowledgeBase.Orama";
export {
  embedText,
  embedTexts,
  DEFAULT_EMBEDDING_MODEL,
  DEFAULT_EMBEDDING_ENGINE,
  DEFAULT_TRANSFORMERS_EMBEDDING_MODEL,
  HELIX_TRANSFORMERS_ENGINE,
  HELIX_TRANSFORMERS_EMBEDDING_MODELS,
  HELIX_EMBEDDING_ENGINE_LABELS,
  EMBEDDING_MODELS,
  isHelixEmbeddingEngine,
  isTransformersEmbeddingModel,
  getEmbeddingModelEngine,
  getEmbeddingModelDimensions,
  getEmbeddingModelsForEngine,
  getProviderDefaultEmbeddingModelForEngine,
} from "./BSKnowledgeBase.Embedding";
export type { BSEmbedOptions } from "./BSKnowledgeBase.Embedding";
export type { HelixEmbeddingProgress } from "./BSKnowledgeBase.Embedding";
export { chunkText, normalizeWhitespace } from "./BSKnowledgeBase.Text";
export type {
  BSKnowledge,
  BSKnowledgeForm,
  BSKnowledgeGroup,
  BSKnowledgeGroupForm,
  BSKnowledgeIndexSnapshot,
  BSKnowledgeSourceType,
} from "./BSKnowledge.Types";
export type {
  BSGroupEmbedding,
  BSKnowledgeIndexDoc,
  BSKnowledgeSearchHit,
} from "./BSKnowledgeBase.Orama";
export type {
  BSIngestOptions,
  BSIngestState,
  BSIngestStatus,
  BSReindexState,
  BSScanResult,
} from "./BSKnowledge.Hooks";
