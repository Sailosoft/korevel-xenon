// BSKnowledgeBase.Orama — Orama vector index manager for the Knowledge Base.
//
// Each Knowledge Group owns an in-memory Orama vector database (schema:
// title / source / knowledgeId / chunkIndex / content / embedding). Because
// Orama lives in memory, every group index is serialized and persisted to
// IndexedDB (via the `knowledgeIndexes` Dexie table) so a browser reload does
// not reset the corpus (feature: persisting data offline).
//
// Embeddings are generated server-side by the SiliconFlow OpenAI-compatible
// endpoint (Qwen3-Embedding-0.6B by default) — see BSKnowledgeBase.Embedding.

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
  embedText,
  embedTexts,
  DEFAULT_EMBEDDING_MODEL,
} from "./BSKnowledgeBase.Embedding";

/** Vector dimension — matches Qwen3-Embedding-0.6B default output (max 1024). */
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

/** Schema shared by every group's vector database. */
const KNOWLEDGE_SCHEMA = {
  title: "string",
  source: "string",
  knowledgeId: "string",
  chunkIndex: "number",
  content: "string",
  embedding: `vector[${KNOWLEDGE_VECTOR_DIMENSION}]`,
} as const;

function createGroupDb(): AnyOrama {
  return create({
    schema: KNOWLEDGE_SCHEMA,
  }) as unknown as AnyOrama;
}

/**
 * In-memory cache of restored group databases (key: groupId). The Orama DB is
 * an in-memory structure that is re-hydrated from its serialized IndexedDB
 * snapshot on every load; for large knowledge bases that JSON restore is slow.
 * Because each group's index is only mutated by `indexKnowledge` /
 * `removeKnowledgeFromIndex` (which reuse the same DB object), keeping the
 * loaded DB around for the session makes chat retrieval near-instant after the
 * first lookup (fix: slow knowledge-base responses).
 */
const groupDbCache = new Map<string, AnyOrama>();

/**
 * Resolve the embedding model configured for a group (falls back to the
 * default 0.6B model). Indexing and retrieval must share the same model so
 * their vectors live in the same space.
 */
async function getGroupEmbeddingModel(groupId: string): Promise<string> {
  try {
    const group = await bsDB.knowledgeGroups.get(groupId);
    return group?.embeddingModel || DEFAULT_EMBEDDING_MODEL;
  } catch {
    return DEFAULT_EMBEDDING_MODEL;
  }
}

/**
 * Load a group's Orama database, restoring its persisted snapshot from
 * IndexedDB when available (otherwise a fresh empty index).
 */
async function loadOrCreateDb(groupId: string): Promise<AnyOrama> {
  const cached = groupDbCache.get(groupId);
  if (cached) return cached;

  const snapshot = await bsDB.knowledgeIndexes.get(groupId);
  let db: AnyOrama;
  if (snapshot?.data) {
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
      db = createGroupDb();
    }
  } else {
    db = createGroupDb();
  }
  groupDbCache.set(groupId, db);
  return db;
}

/** Serialize + persist a group's Orama database to IndexedDB. */
async function saveDb(db: AnyOrama, groupId: string): Promise<void> {
  try {
    const data = (await persist(db, INDEX_FORMAT)) as string;
    const snapshot: BSKnowledgeIndexSnapshot = {
      id: groupId,
      format: INDEX_FORMAT,
      data,
      updatedDate: new Date().toISOString(),
    };
    await bsDB.knowledgeIndexes.put(snapshot);
  } catch (err) {
    console.error("[KnowledgeBase] Failed to persist Orama index:", err);
  }
}

/**
 * Index a knowledge source into its group's vector database:
 * chunks the text, embeds every chunk, inserts them, and persists the index.
 * Returns the Orama document ids (stored on the knowledge record for cleanup).
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
): Promise<string[]> {
  const chunks = chunkText(payload.content);
  if (chunks.length === 0) return [];

  const db = await loadOrCreateDb(groupId);
  const embeddingModel = model ?? (await getGroupEmbeddingModel(groupId));
  const vectors = await embedTexts(chunks, embeddingModel);

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

  await saveDb(db, groupId);
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
  const db = await loadOrCreateDb(groupId);
  for (const id of chunkIds) {
    try {
      await remove(db, id);
    } catch {
      /* chunk already gone — ignore */
    }
  }
  await saveDb(db, groupId);
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
  const db = await loadOrCreateDb(groupId);
  const embeddingModel = await getGroupEmbeddingModel(groupId);
  const vector = await embedText(query, embeddingModel);

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
