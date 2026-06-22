/**
 * BFlowRunDB — PhazeRepository-based data access for pipeline run queries.
 *
 * Wraps the existing BFlowPipelineRunRepository, BFlowJobRunRepository,
 * and BFlowStepRunRepository (all extending PhazeRepository) into a
 * single cohesive interface used by the run view components.
 */

import { bflowDB } from "../database/BFlowDatabase";
import type {
  BFlowPipelineRunEntity,
  BFlowJobRun,
  BFlowStepRun,
} from "./BFlowRun.Types";

/**
 * BFlowRunDB — Centralised data access for pipeline run queries.
 *
 * Composes the three run repos registered on bflowDB, exposing
 * convenience methods and maintaining a single import surface area
 * for component-level consumers.
 */
export class BFlowRunDB {
  /** Pipeline run repo (extends PhazeRepository) */
  readonly pipelineRuns = bflowDB.pipelineRunsRepo;
  /** Job run repo (extends PhazeRepository) */
  readonly jobRuns = bflowDB.jobRunsRepo;
  /** Step run repo (extends PhazeRepository) */
  readonly stepRuns = bflowDB.stepRunsRepo;

  // ─── Convenience Queries ───────────────────────────────────────

  /**
   * Fetch the most recent pipeline run for a given pipeline.
   */
  async getLatestPipelineRun(
    pipelineId: string,
  ): Promise<BFlowPipelineRunEntity | undefined> {
    return this.pipelineRuns.getLatest(pipelineId);
  }

  /**
   * Fetch all job runs for a given pipeline run, sorted by execution order.
   */
  async getJobRunsForRun(runId: string): Promise<BFlowJobRun[]> {
    return this.jobRuns.getByRunId(runId);
  }

  /**
   * Fetch all step runs for a given pipeline run.
   */
  async getStepRunsForRun(runId: string): Promise<BFlowStepRun[]> {
    return this.stepRuns.getByRunId(runId);
  }

  /**
   * Fetch all data for a pipeline run — pipeline run entity, job runs,
   * and step runs. Convenience wrapper for the "Generate Report" flow.
   */
  async getRunDataForReport(runId: string) {
    return this.pipelineRuns.getRunWithJobsAndSteps(
      runId,
      this.jobRuns,
      this.stepRuns,
    );
  }
}

/** Singleton instance */
export const bflowRunDB = new BFlowRunDB();
