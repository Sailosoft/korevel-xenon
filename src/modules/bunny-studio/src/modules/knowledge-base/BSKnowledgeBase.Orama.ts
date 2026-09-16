// BSKnowledgeBase.Orama — Orama vector index manager for the Knowledge Base.
//
// Each Knowledge Group owns an in-memory Orama vector database (schema:
// title / source / knowledgeId / chunkIndex / content / embedding). Because
// Orama lives in memory, every group index is serialized and persisted to
// IndexedDB (via the `knowledgeIndexes` Dexie table) so a browser reload does
// not reset the corpus (feature: persisting data offline).
//
// Embeddings are generated through the group's engine (BSKnowledgeBase.Embedding):
// the local Transformers.js worker by default, or the SiliconFlow / DeepInfra
// server route for groups pinned to an LLM provider.

"use client";

import {
  create,
  insert,
  remove,
  search,
  count,
  type AnyOrama,
} from "@orama/orama";
import { persist, restore } from "@orama/plugin-data-persistence";
import { bsDB } from "../../BSDatabase";
import type {
  BSKnowledgeIndexSnapshot,
  BSKnowledgeSourceType,
} from "./BSKnowledge.Types";
import { chunkText } from "./BSKnowledgeBase.Text";
import {
  DEFAULT_EMBEDDING_ENGINE,
  HELIX_EMBEDDING_MODEL_DIMENSIONS,
  embedText,
  embedTexts,
  getEmbeddingModelDimensions,
  getEmbeddingModelEngine,
  getProviderDefaultEmbeddingModelForEngine,
  isHelixEmbeddingEngine,
  type HelixEmbeddingEngine,
  type HelixEmbeddingProgress,
} from "./BSKnowledgeBase.Embedding";

/**
 * Legacy vector dimension — the old hardcoded Qwen3-Embedding-0.6B output.
 * Dimensions are now resolved per group; this remains as the fallback used to
 * validate snapshots persisted before the engine split.
 * @deprecated Use `resolveGroupEmbedding(groupId).dimensions` instead.
 */
export const KNOWLEDGE_VECTOR_DIMENSION = 1024;
/** Serialization format used for the persisted snapshot (JSON is portable). */
const INDEX_FORMAT = "json" as const;

/** A single Orama document = one chunk of a knowledge source. */
export interface BSKnowledgeIndexDoc {
  title: string;
  source: BSKnowledgeSourceType;
  knowledgeId: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
}

/** Search hit shape returned to consumers (RAG context builder). */
export interface BSKnowledgeSearchHit {
  id: string;
  score: number;
  title: string;
  source: BSKnowledgeSourceType;
  knowledgeId: string;
  content: string;
}

/** Resolved embedding configuration of a knowledge group. */
export interface BSGroupEmbedding {
  engine: HelixEmbeddingEngine;
  model: string;
  dimensions: number;
}

/** Schema for a group's vector database (dimension resolved per group). */
function buildKnowledgeSchema(dimensions: number) {
  return {
    title: "string",
    source: "string",
    knowledgeId: "string",
    chunkIndex: "number",
    content: "string",
    embedding: `vector[${dimensions}]`,
  } as const;
}

/** Create an empty Orama database sized for the group's vector dimension. */
function createGroupDb(dimensions: number): AnyOrama {
  return create({
    schema: buildKnowledgeSchema(dimensions),
  }) as unknown as AnyOrama;
}

/**
 * In-memory cache of restored group databases (key: groupId), together with the
 * dimension they were built for. The Orama DB is an in-memory structure that is
 * re-hydrated from its serialized IndexedDB snapshot on every load; for large
 * knowledge bases that JSON restore is slow. Because each group's index is only
 * mutated by `indexKnowledge` / `removeKnowledgeFromIndex` (which reuse the same
 * DB object), keeping the loaded DB around for the session makes chat retrieval
 * near-instant after the first lookup (fix: slow knowledge-base responses).
 */
const groupDbCache = new Map<
  string,
  { db: AnyOrama; dimensions: number }
>();

/**
 * Resolve the embedding engine, model, and vector dimension configured for a
 * group (falls back to the local engine and its default model). Indexing and
 * retrieval must share this configuration so their vectors are comparable.
 */
export async function resolveGroupEmbedding(
  groupId: string,
): Promise<BSGroupEmbedding> {
  let engine: HelixEmbeddingEngine = DEFAULT_EMBEDDING_ENGINE;
  let model: string | undefined;
  try {
    const group = await bsDB.knowledgeGroups.get(groupId);
    model = group?.embeddingModel || undefined;
    engine =
      group?.embeddingEngine ??
      (model ? getEmbeddingModelEngine(model) : DEFAULT_EMBEDDING_ENGINE);
  } catch (err) {
    console.error("[KnowledgeBase] Failed to read group embedding:", err);
  }
  if (!isHelixEmbeddingEngine(engine)) engine = DEFAULT_EMBEDDING_ENGINE;

  const resolvedModel =
    model || getProviderDefaultEmbeddingModelForEngine(engine);
  const dimensions =
    HELIX_EMBEDDING_MODEL_DIMENSIONS[resolvedModel] ??
    getEmbeddingModelDimensions(
      getProviderDefaultEmbeddingModelForEngine(engine),
    );
  return { engine, model: resolvedModel, dimensions };
}

/**
 * Load a group's Orama database, restoring its persisted snapshot from
 * IndexedDB when available (otherwise a fresh empty index). A snapshot whose
 * dimension does not match the group's current embedding configuration is
 * dropped — re-indexing is required rather than silently mixing vector spaces.
 */
async function loadOrCreateDb(groupId: string): Promise<AnyOrama> {
  const embedding = await resolveGroupEmbedding(groupId);

  const cached = groupDbCache.get(groupId);
  if (cached) {
    if (cached.dimensions === embedding.dimensions) return cached.db;
    console.warn(
      `[KnowledgeBase] Group ${groupId} changed dimension (${cached.dimensions} → ${embedding.dimensions}); dropping the stale index.`,
    );
    groupDbCache.delete(groupId);
    await bsDB.knowledgeIndexes.delete(groupId);
  }

  const snapshot = await bsDB.knowledgeIndexes.get(groupId);
  let db: AnyOrama;
  if (snapshot?.data) {
    const snapshotDimensions =
      snapshot.dimensions ?? KNOWLEDGE_VECTOR_DIMENSION;
    if (snapshotDimensions !== embedding.dimensions) {
      console.warn(
        `[KnowledgeBase] Dropping index for group ${groupId}: stored dimension ${snapshotDimensions} ≠ ${embedding.dimensions}. Re-index to restore retrieval.`,
      );
      await bsDB.knowledgeIndexes.delete(groupId);
      db = createGroupDb(embedding.dimensions);
    } else {
      try {
        db = (await restore(
          snapshot.format as "json",
          snapshot.data,
        )) as unknown as AnyOrama;
      } catch (err) {
        console.error(
          "[KnowledgeBase] Failed to restore Orama index; rebuilding:",
          err,
        );
        db = createGroupDb(embedding.dimensions);
      }
    }
  } else {
    db = createGroupDb(embedding.dimensions);
  }
  groupDbCache.set(groupId, { db, dimensions: embedding.dimensions });
  return db;
}

/** Serialize + persist a group's Orama database (with its embedding metadata). */
async function saveDb(
  db: AnyOrama,
  groupId: string,
  embedding: BSGroupEmbedding,
): Promise<void> {
  try {
    const data = (await persist(db, INDEX_FORMAT)) as string;
    const snapshot: BSKnowledgeIndexSnapshot = {
      id: groupId,
      format: INDEX_FORMAT,
      data,
      engine: embedding.engine,
      model: embedding.model,
      dimensions: embedding.dimensions,
      updatedDate: new Date().toISOString(),
    };
    await bsDB.knowledgeIndexes.put(snapshot);
  } catch (err) {
    console.error("[KnowledgeBase] Failed to persist Orama index:", err);
  }
}

/**
 * Index a knowledge source into its group's vector database:
 * chunks the text, embeds every chunk with the group's engine, inserts them,
 * and persists the index. Returns the Orama document ids (stored on the
 * knowledge record for cleanup).
 */
export async function indexKnowledge(
  groupId: string,
  payload: {
    knowledgeId: string;
    title: string;
    source: BSKnowledgeSourceType;
    content: string;
  },
  model?: string,
  onProgress?: HelixEmbeddingProgress,
): Promise<string[]> {
  const chunks = chunkText(payload.content);
  if (chunks.length === 0) return [];

  const embedding = await resolveGroupEmbedding(groupId);
  const db = await loadOrCreateDb(groupId);
  const effectiveModel = model || embedding.model;
  const effectiveEngine = model
    ? getEmbeddingModelEngine(model)
    : embedding.engine;
  const vectors = await embedTexts(chunks, {
    engine: effectiveEngine,
    model: effectiveModel,
    onProgress,
  });

  // Never insert a vector whose size differs from the index schema — Orama
  // would otherwise mix incompatible vector spaces.
  const mismatched = vectors.find(
    (vector) => vector.length !== embedding.dimensions,
  );
  if (mismatched) {
    throw new Error(
      `Embedding dimension mismatch (expected ${embedding.dimensions}, got ${mismatched.length}). Clear and re-index this group.`,
    );
  }

  const ids: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const doc: BSKnowledgeIndexDoc = {
      title: payload.title,
      source: payload.source,
      knowledgeId: payload.knowledgeId,
      chunkIndex: i,
      content: chunks[i],
      embedding: vectors[i] ?? [],
    };
    const id = await insert(db, doc);
    ids.push(id);
  }

  await saveDb(db, groupId, embedding);
  return ids;
}

/**
 * Remove a knowledge's chunks from its group's vector database and persist
 * the updated index. Missing / already-removed ids are ignored.
 */
export async function removeKnowledgeFromIndex(
  groupId: string,
  chunkIds: string[],
): Promise<void> {
  if (!groupId || chunkIds.length === 0) return;
  const embedding = await resolveGroupEmbedding(groupId);
  const db = await loadOrCreateDb(groupId);
  for (const id of chunkIds) {
    try {
      await remove(db, id);
    } catch {
      /* chunk already gone — ignore */
    }
  }
  await saveDb(db, groupId, embedding);
}

/** Number of indexed chunks for a group (0 when no index exists). */
export async function getGroupIndexCount(groupId: string): Promise<number> {
  const db = await loadOrCreateDb(groupId);
  return count(db);
}

/**
 * Vector-similarity search across a group's indexed knowledge.
 * Returns the top matching chunks (documents) for RAG context building.
 */
export async function searchKnowledgeGroup(
  groupId: string,
  query: string,
  limit = 4,
): Promise<BSKnowledgeSearchHit[]> {
  if (!groupId || !query.trim()) return [];
  const embedding = await resolveGroupEmbedding(groupId);
  const db = await loadOrCreateDb(groupId);

  let vector: number[];
  try {
    vector = await embedText(query, {
      engine: embedding.engine,
      model: embedding.model,
      isQuery: true,
    });
  } catch (err) {
    console.error("[KnowledgeBase] Query embedding failed:", err);
    return [];
  }
  if (vector.length !== embedding.dimensions) {
    console.warn(
      `[KnowledgeBase] Query dimension mismatch for group ${groupId}; clear and re-index this group.`,
    );
    return [];
  }

  const results = await search(db, {
    mode: "vector",
    vector: { value: vector, property: "embedding" },
    similarity: 0.1,
    limit,
    includeVectors: false,
  });

  return results.hits.map((hit) => {
    const doc = hit.document as unknown as BSKnowledgeIndexDoc;
    return {
      id: hit.id,
      score: hit.score,
      title: doc.title,
      source: doc.source,
      knowledgeId: doc.knowledgeId,
      content: doc.content,
    };
  });
}

/**
 * Build a ready-to-inject RAG context block for the chat assistant. Called by
 * the chat send flow when a knowledge group is selected for the conversation.
 */
export async function retrieveKnowledgeContext(
  groupId: string,
  query: string,
  limit = 4,
): Promise<string> {
  const hits = await searchKnowledgeGroup(groupId, query, limit);
  if (hits.length === 0) return "";
  const blocks = hits.map(
    (h) => `[Source: ${h.title}]\n${h.content.trim()}`,
  );
  return blocks.join("\n\n---\n\n");
}

/** Delete a group's persisted index entirely (used when a group is removed). */
export async function deleteGroupIndex(groupId: string): Promise<void> {
  groupDbCache.delete(groupId);
  await bsDB.knowledgeIndexes.delete(groupId);
}

/**
 * Clear every group's RAG vector index — all persisted snapshots and all
 * in-memory caches. Knowledge source records are kept; they only need to be
 * re-indexed (chunk + embed again) to restore retrieval.
 */
export async function clearAllGroupIndexes(): Promise<void> {
  groupDbCache.clear();
  await bsDB.knowledgeIndexes.clear();
}
