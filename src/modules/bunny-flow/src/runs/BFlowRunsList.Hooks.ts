"use client";

/**
 * BFlowRunsList.Hooks — Data fetching hooks for the pipeline runs list.
 *
 * Fetches pipeline runs from IndexedDB and enriches them with
 * pipeline and workflow names for display in the runs list UI.
 */

import { useLiveQuery } from "dexie-react-hooks";
import { bflowDB } from "../database/BFlowDatabase";
import type { BFlowRunDisplayItem } from "./BFlowRunsList.Types";

// ─── Cache Helpers ─────────────────────────────────────────────────

/**
 * Build an in-memory lookup map from an array of entities with an `id` property.
 */
function toLookup<T extends { id: string }>(
  items: T[],
): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    map.set(item.id, item);
  }
  return map;
}

// ─── Hook ──────────────────────────────────────────────────────────

export interface UseBFlowRunsListOptions {
  /** If provided, only return runs belonging to this flow (definition). */
  flowId?: string;
  /** If provided, only return runs for this specific pipeline. */
  pipelineId?: string;
}

export interface UseBFlowRunsListResult {
  /** Enriched display items, sorted by most recent first. */
  runs: BFlowRunDisplayItem[];
  /** True while the DB query is resolving for the first time. */
  isLoading: boolean;
  /** Total count of runs. */
  totalCount: number;
}

/**
 * Fetch and enrich pipeline runs with pipeline and workflow names.
 *
 * Uses `useLiveQuery` for automatic reactivity — the list updates
 * when the underlying IndexedDB data changes.
 */
export function useBFlowRunsList(
  options: UseBFlowRunsListOptions = {},
): UseBFlowRunsListResult {
  const { flowId, pipelineId } = options;

  const result = useLiveQuery(async (): Promise<BFlowRunDisplayItem[]> => {
    // ── 1. Fetch all pipeline runs ────────────────────────────────
    let runs = await bflowDB.pipelineRunsRepo.getSummaryList();

    // Filter by pipelineId early for optimisation
    if (pipelineId) {
      runs = runs.filter((r) => r.pipelineId === pipelineId);
    }

    // Filter by flowId
    if (flowId) {
      runs = runs.filter((r) => r.flowId === flowId);
    }

    if (runs.length === 0) return [];

    // ── 2. Collect unique pipeline IDs and template IDs ───────────
    const pipelineIds = new Set(runs.map((r) => r.pipelineId));
    const templateIds = new Set(runs.map((r) => r.templateId));

    // ── 3. Fetch related entities in parallel ─────────────────────
    const [pipelines, workflows] = await Promise.all([
      bflowDB.pipelines
        .filter((p) => pipelineIds.has(p.id))
        .toArray(),
      bflowDB.workflowTemplates
        .filter((w) => templateIds.has(w.id))
        .toArray(),
    ]);

    const pipelineMap = toLookup(pipelines);
    const workflowMap = toLookup(workflows);

    // ── 4. Enrich runs with names ────────────────────────────────
    return runs.map((run) => {
      const pipeline = pipelineMap.get(run.pipelineId);
      const workflow = workflowMap.get(run.templateId);
      return {
        id: run.id,
        pipelineId: run.pipelineId,
        pipelineName: pipeline?.name ?? pipeline?.slug ?? "Unknown Pipeline",
        flowId: run.flowId,
        templateId: run.templateId,
        workflowName: workflow?.name ?? workflow?.slug ?? "Unknown Workflow",
        status: run.status,
        runNumber: run.runNumber,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        createdAt: run.createdAt,
      };
    });
  }, [flowId, pipelineId]);

  const runs = result ?? [];
  return {
    runs,
    isLoading: result === undefined,
    totalCount: runs.length,
  };
}
