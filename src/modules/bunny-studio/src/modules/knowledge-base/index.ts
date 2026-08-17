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
  scanWebsite,
  readFileAsText,
  isAllowedResourceFile,
  RESOURCE_FILE_EXTENSIONS,
} from "./BSKnowledge.Hooks";
export {
  indexKnowledge,
  removeKnowledgeFromIndex,
  searchKnowledgeGroup,
  retrieveKnowledgeContext,
  getGroupIndexCount,
  deleteGroupIndex,
  KNOWLEDGE_VECTOR_DIMENSION,
} from "./BSKnowledgeBase.Orama";
export {
  embedText,
  embedTexts,
  DEFAULT_EMBEDDING_MODEL,
  EMBEDDING_MODELS,
} from "./BSKnowledgeBase.Embedding";
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
  BSKnowledgeIndexDoc,
  BSKnowledgeSearchHit,
} from "./BSKnowledgeBase.Orama";
export type {
  BSIngestOptions,
  BSIngestState,
  BSIngestStatus,
  BSScanResult,
} from "./BSKnowledge.Hooks";
