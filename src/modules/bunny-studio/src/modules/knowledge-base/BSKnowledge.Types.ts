// BSKnowledge.Types — Types for Bunny AI Studio Knowledge Base
//
// The knowledge base lets the user build a local (IndexedDB + Orama) RAG
// corpus:
//  - Knowledge Groups organize knowledge sources. A group is selectable in
//    chat so the assistant can answer from its contents (feature: knowledge
//    base tool).
//  - Knowledges are individual sources added either by scanning a website or
//    by uploading a .txt / .md file. Each knowledge belongs to exactly one
//    group; its text is chunked, embedded (local Transformers.js worker or the
//    SiliconFlow / DeepInfra server route), and indexed into the group's Orama
//    vector database.
//  - Categories tag knowledge groups (feature: add category to knowledge
//    group) so they can be filtered / organized.

import type { HelixEmbeddingEngine } from "@/src/modules/helix";

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
   * Engine that produces this group's vectors: "transformers" (local browser
   * worker, the default for new groups) or an LLM provider reached through the
   * Helix server route. Kept consistent across the whole group so indexing and
   * retrieval stay in the same vector space.
   */
  embeddingEngine?: HelixEmbeddingEngine;
  /**
   * Embedding model used for this group's vectors. Kept consistent across the
   * whole group so indexing and retrieval stay in the same vector space.
   * Defaults to the selected engine's default (feature: BSEmbeddings).
   */
  embeddingModel?: string;
  /**
   * Output dimension of `embeddingModel`, stored so a persisted Orama index can
   * be validated (and dropped) instead of silently mixing vector spaces.
   */
  embeddingDimensions?: number;
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
  /** engine that produced the stored vectors (used to validate the snapshot) */
  engine?: HelixEmbeddingEngine;
  /** model that produced the stored vectors */
  model?: string;
  /** vector dimension of the stored vectors */
  dimensions?: number;
  /** ISO datetime string of the last persist */
  updatedDate: string;
}
