// BSKnowledge.Hooks — Client logic for adding & managing Knowledges.
//
// Handles the two ingestion paths:
//  - Website: POST the URL to the server scan route (CORS-free fetch) which
//    returns clean text, then chunk + embed + index into the group's Orama
//    vector database and persist a knowledge record.
//  - Resource: read an uploaded .txt / .md file, then the same indexing flow.
//
// Also handles deletion (removing the exact Orama chunks + the record).

"use client";

import { useCallback, useRef, useState } from "react";
import { v7 as uuidv7 } from "uuid";
import {
  BS_API_TOKEN_HEADER,
  getBSApiToken,
} from "../../BSApiSecurity";
import { bsDB } from "../../BSDatabase";
import {
  deleteGroupIndex,
  indexKnowledge,
  removeKnowledgeFromIndex,
  resolveGroupEmbedding,
} from "./BSKnowledgeBase.Orama";
import type {
  BSKnowledge,
  BSKnowledgeSourceType,
} from "./BSKnowledge.Types";

// ─── Public types ───────────────────────────────────────────────────────

export type BSIngestStatus = "idle" | "ingesting" | "success" | "error";

export interface BSIngestState {
  status: BSIngestStatus;
  /** Human-readable error when status === "error" */
  error: string;
  /** Status message shown while ingesting */
  message: string;
  /** The persisted knowledge from the most recent successful ingest */
  knowledge: BSKnowledge | null;
}

/** State of a group re-index run (drives the shared status banner). */
export interface BSReindexState {
  status: BSIngestStatus;
  /** Human-readable error when status === "error" */
  error: string;
  /** Progress message ("Re-indexing 2/5 sources…") */
  message: string;
}

/** Normalized result of the website scan route. */
export interface BSScanResult {
  title: string;
  description?: string;
  content: string;
  url: string;
}

const INITIAL_STATE: BSIngestState = {
  status: "idle",
  error: "",
  message: "",
  knowledge: null,
};

const INITIAL_REINDEX_STATE: BSReindexState = {
  status: "idle",
  error: "",
  message: "",
};

// ─── Standalone helpers ─────────────────────────────────────────────────

/** Scan a website URL server-side and return its clean text content. */
export async function scanWebsite(url: string): Promise<BSScanResult> {
  const res = await fetch("/api/bunny-studio/knowledge/scan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [BS_API_TOKEN_HEADER]: getBSApiToken() ?? "",
    },
    body: JSON.stringify({ url }),
  });
  const data = (await res.json()) as Partial<BSScanResult> & {
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error ?? "Failed to scan the website.");
  }
  return data as BSScanResult;
}

/** Read a text file (.txt / .md) into a string. */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read the file."));
    reader.readAsText(file);
  });
}

/** The file extensions accepted for the "Resources" ingestion tab. */
export const RESOURCE_FILE_EXTENSIONS = [".txt", ".md", ".markdown"];

export function isAllowedResourceFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  return RESOURCE_FILE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

// ─── Hook ───────────────────────────────────────────────────────────────

export interface BSIngestOptions {
  /** target knowledge group id */
  groupId: string;
  /** display title */
  title: string;
  /** website | resource */
  sourceType: BSKnowledgeSourceType;
  /** full text to chunk + embed */
  content: string;
  /** source URL (website) */
  url?: string;
  /** uploaded file name (resource) */
  fileName?: string;
  /**
   * Embedding model for the vectors (must match the group's configured model).
   * Defaults to Qwen/Qwen3-Embedding-0.6B when omitted.
   */
  model?: string;
}

export function useBSKnowledgeIngest() {
  const [state, setState] = useState<BSIngestState>(INITIAL_STATE);
  // Guards against stale responses when a newer ingest is running.
  const requestIdRef = useRef(0);

  /**
   * Chunk + embed + index a source into its group's Orama vector database and
   * persist the knowledge record. Returns the persisted record (or null).
   */
  const ingestKnowledge = useCallback(
    async (opts: BSIngestOptions): Promise<BSKnowledge | null> => {
      const requestId = ++requestIdRef.current;
      const knowledgeId = uuidv7();
      const started = performance.now();

      setState({
        status: "ingesting",
        error: "",
        message: "Chunking & embedding content…",
        knowledge: null,
      });

      const finish = (patch: Partial<BSIngestState>) => {
        if (requestId !== requestIdRef.current) return;
        setState((s) => ({ ...s, ...patch }));
      };

      try {
        if (!opts.groupId) throw new Error("Select a knowledge group first.");
        if (!opts.title.trim()) throw new Error("A title is required.");
        if (!opts.content.trim()) throw new Error("The source has no text.");

        // Index into the group's Orama vector database first (needs the id).
        const chunkIds = await indexKnowledge(
          opts.groupId,
          {
            knowledgeId,
            title: opts.title,
            source: opts.sourceType,
            content: opts.content,
          },
          opts.model,
          // Surface local-model loading progress in the status banner.
          (message) => finish({ message }),
        );

        const knowledge: BSKnowledge = {
          id: knowledgeId,
          knowledgeGroupId: opts.groupId,
          title: opts.title,
          sourceType: opts.sourceType,
          url: opts.url,
          fileName: opts.fileName,
          content: opts.content,
          chunkIds,
          chunkCount: chunkIds.length,
          createdDate: new Date().toISOString(),
        };
        // Persist directly on the Dexie table so we control the knowledge id
        // (it is referenced by every Orama chunk's `knowledgeId` field).
        await bsDB.knowledges.add(knowledge);

        finish({
          status: "success",
          error: "",
          message: `Indexed ${chunkIds.length} chunk(s) in ${Math.max(
            performance.now() - started,
            0,
          ).toFixed(0)}ms.`,
          knowledge,
        });
        return knowledge;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to add knowledge.";
        finish({ status: "error", error: message, message: "" });
        return null;
      }
    },
    [],
  );

  /**
   * Remove a knowledge from its group's Orama index and delete its record.
   */
  const removeKnowledge = useCallback(async (knowledge: BSKnowledge) => {
    await removeKnowledgeFromIndex(
      knowledge.knowledgeGroupId,
      knowledge.chunkIds,
    );
    await bsDB.knowledgesRepo.delete(knowledge.id);
  }, []);

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  return { state, ingestKnowledge, removeKnowledge, reset };
}

// ─── Re-index ───────────────────────────────────────────────────────────

/**
 * Rebuild a group's Orama index from its stored knowledge sources: clears the
 * index, then re-chunks + re-embeds every source with the group's current
 * engine/model. Sequential so progress can be reported per source.
 */
export function useBSKnowledgeReindex() {
  const [state, setState] = useState<BSReindexState>(INITIAL_REINDEX_STATE);
  const requestIdRef = useRef(0);

  const reindexGroup = useCallback(async (groupId: string): Promise<boolean> => {
    const requestId = ++requestIdRef.current;
    const finish = (patch: Partial<BSReindexState>) => {
      if (requestId !== requestIdRef.current) return;
      setState((s) => ({ ...s, ...patch }));
    };

    if (!groupId) {
      finish({
        status: "error",
        error: "Select a knowledge group first.",
        message: "",
      });
      return false;
    }

    setState({
      status: "ingesting",
      error: "",
      message: "Clearing the group index…",
    });
    try {
      const embedding = await resolveGroupEmbedding(groupId);
      const sources = await bsDB.knowledgesRepo.listByGroup(groupId);
      await deleteGroupIndex(groupId);

      let indexed = 0;
      for (const source of sources) {
        finish({
          message: `Re-indexing ${indexed + 1}/${sources.length} source(s)…`,
        });
        const chunkIds = await indexKnowledge(
          groupId,
          {
            knowledgeId: source.id,
            title: source.title,
            source: source.sourceType,
            content: source.content,
          },
          embedding.model,
          (message) => finish({ message }),
        );
        await bsDB.knowledges.update(source.id, {
          chunkIds,
          chunkCount: chunkIds.length,
        });
        indexed += 1;
      }

      finish({
        status: "success",
        error: "",
        message: `Re-indexed ${indexed} source(s) with ${embedding.model}.`,
      });
      return true;
    } catch (err) {
      finish({
        status: "error",
        error: err instanceof Error ? err.message : "Re-indexing failed.",
        message: "",
      });
      return false;
    }
  }, []);

  const reset = useCallback(() => setState(INITIAL_REINDEX_STATE), []);

  return { state, reindexGroup, reset };
}
