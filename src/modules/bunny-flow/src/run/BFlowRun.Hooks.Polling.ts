/**
 * BFlowRun.Hooks.Polling — Custom React hook for polling active pipeline run state.
 *
 * Separates polling logic (loading, interval-based polling, manual refresh)
 * from the presentation layer.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { bflowRunDB } from "./BFlowRunDB";
import type {
  BFlowPipelineRunEntity,
  BFlowJobRun,
  BFlowStepRun,
} from "./BFlowRun.Types";

// ═══════════════════════════════════════════════════════════════════
// useBFlowRunPolling — polls active run state from IndexedDB
// ═══════════════════════════════════════════════════════════════════

export interface BFlowRunPollingState {
  activeRun: BFlowPipelineRunEntity | undefined;
  jobRuns: BFlowJobRun[];
  stepRuns: BFlowStepRun[];
  initialLoadDone: boolean;
  /**
   * Immediately refreshes run data from IndexedDB, bypassing the polling interval.
   * Used by the submit hook to force an immediate state update after pipeline execution completes.
   */
  refreshRunData: () => Promise<void>;
}

/**
 * Loads the latest pipeline run on mount, then polls every 2 seconds
 * while a run is actively executing (status "running" or "pending").
 * Stops polling once the run reaches a terminal state.
 */
export function useBFlowRunPolling(
  pipelineId: string | undefined,
): BFlowRunPollingState {
  const [activeRun, setActiveRun] = useState<
    BFlowPipelineRunEntity | undefined
  >();
  const [jobRuns, setJobRuns] = useState<BFlowJobRun[]>([]);
  const [stepRuns, setStepRuns] = useState<BFlowStepRun[]>([]);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  /**
   * Immediately fetches the latest run data from IndexedDB and updates state.
   * Used to force an immediate refresh after pipeline execution completes,
   * bypassing the 2-second polling interval delay.
   */
  const refreshRunData = useCallback(async () => {
    if (!pipelineId) return;
    const run = await bflowRunDB.getLatestPipelineRun(pipelineId);
    setActiveRun(run);

    if (run) {
      const [jobs, steps] = await Promise.all([
        bflowRunDB.getJobRunsForRun(run.id),
        bflowRunDB.getStepRunsForRun(run.id),
      ]);
      setJobRuns(jobs);
      setStepRuns(steps);
    } else {
      setJobRuns([]);
      setStepRuns([]);
    }
  }, [pipelineId]);

  useEffect(() => {
    if (!pipelineId) {
      setActiveRun(undefined);
      setJobRuns([]);
      setStepRuns([]);
      setInitialLoadDone(true);
      return;
    }

    let cancelled = false;

    async function load() {
      const run = await bflowRunDB.getLatestPipelineRun(pipelineId!);
      if (cancelled) return;
      setActiveRun(run);
      setInitialLoadDone(true);

      if (run) {
        const [jobs, steps] = await Promise.all([
          bflowRunDB.getJobRunsForRun(run.id),
          bflowRunDB.getStepRunsForRun(run.id),
        ]);
        if (cancelled) return;
        setJobRuns(jobs);
        setStepRuns(steps);
      } else {
        setJobRuns([]);
        setStepRuns([]);
      }
    }

    load();

    const interval = setInterval(async () => {
      const run = await bflowRunDB.getLatestPipelineRun(pipelineId!);
      if (cancelled) return;

      if (!run || (run.status !== "running" && run.status !== "pending")) {
        setActiveRun(run);
        clearInterval(interval);
        return;
      }

      setActiveRun(run);

      const [jobs, steps] = await Promise.all([
        bflowRunDB.getJobRunsForRun(run.id),
        bflowRunDB.getStepRunsForRun(run.id),
      ]);
      if (cancelled) return;
      setJobRuns(jobs);
      setStepRuns(steps);
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pipelineId]);

  return { activeRun, jobRuns, stepRuns, initialLoadDone, refreshRunData };
}
