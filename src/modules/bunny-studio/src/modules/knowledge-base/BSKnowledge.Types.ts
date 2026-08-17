// BSKnowledge.Types — Types for Bunny AI Studio Knowledge Base
//
// The knowledge base lets the user build a local (IndexedDB + Orama) RAG
// corpus:
//  - Knowledge Groups organize knowledge sources. A group is selectable in
//    chat so the assistant can answer from its contents (feature: knowledge
//    base tool).
//  - Knowledges are individual sources added either by scanning a website or
//    by uploading a .txt / .md file. Each knowledge belongs to exactly one
//    group; its text is chunked, embedded (SiliconFlow OpenAI-compatible
//    embeddings), and indexed into the group's Orama vector database.
//  - Categories tag knowledge groups (feature: add category to knowledge
//    group) so they can be filtered / organized.

export type BSKnowledgeSourceType = "website" | "resource";

export interface BSKnowledgeGroup {
  /** uuidv7 primary key */
  id: string;
  /** display name */
  name: string;
  /** optional category tag (feature: add category to knowledge group) */
  category?: string;
  /** optional description */
  description?: string;
  /**
   * Embedding model used for this group's vectors. Kept consistent across the
   * whole group so indexing and retrieval stay in the same vector space.
   * Defaults to Qwen/Qwen3-Embedding-0.6B (feature: BSEmbeddings).
   */
  embeddingModel?: string;
  /** ISO datetime string */
  createdDate: string;
}

export interface BSKnowledge {
  /** uuidv7 primary key */
  id: string;
  /** owning knowledge group id */
  knowledgeGroupId: string;
  /** display title (website title or file name) */
  title: string;
  /** how this source was added — scanned website or uploaded resource */
  sourceType: BSKnowledgeSourceType;
  /** source website URL (when sourceType === "website") */
  url?: string;
  /** uploaded file name (when sourceType === "resource") */
  fileName?: string;
  /** full extracted text of the source (kept for reference / re-indexing) */
  content: string;
  /**
   * Orama document ids of every chunk indexed for this knowledge. Used to
   * remove exactly those chunks from the group's vector index on delete.
   */
  chunkIds: string[];
  /** number of chunks indexed into Orama */
  chunkCount: number;
  /** ISO datetime string */
  createdDate: string;
}

/** Form shape used when creating/editing a knowledge group */
export type BSKnowledgeGroupForm = Omit<
  BSKnowledgeGroup,
  "id" | "createdDate"
>;

/** Form shape used when creating a knowledge (ids + timestamps injected) */
export type BSKnowledgeForm = Omit<BSKnowledge, "id" | "createdDate">;

/**
 * Persisted Orama index snapshot for a knowledge group. Because the Orama
 * databases are in-memory, each group's vector index is serialized and stored
 * here (in IndexedDB) so it survives browser reloads (feature: BSKnowledgeBase).
 */
export interface BSKnowledgeIndexSnapshot {
  /** primary key = knowledgeGroupId */
  id: string;
  /** serialization format ("json" | "binary" | …) */
  format: string;
  /** serialized Orama database */
  data: string;
  /** ISO datetime string of the last persist */
  updatedDate: string;
}
