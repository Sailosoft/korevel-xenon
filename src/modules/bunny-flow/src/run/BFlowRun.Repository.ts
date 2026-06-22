import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import {
  BFlowPipelineRunEntity,
  BFlowJobRun,
  BFlowStepRun,
  BFlowPipelineRunSummary,
} from "./BFlowRun.Types";

// ─── Pipeline Run Repository ───────────────────────────────────────

export class BFlowPipelineRunRepository extends PhazeRepository<BFlowPipelineRunEntity> {
  /**
   * Get all runs for a specific pipeline, ordered by creation date descending.
   */
  async getByPipelineId(
    pipelineId: string,
  ): Promise<BFlowPipelineRunEntity[]> {
    const all = await this.set.toArray();
    return all
      .filter((r) => r.pipelineId === pipelineId)
      .sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
  }

  /**
   * Get the most recent pipeline run for a given pipeline.
   * Uses reverse chronological order by createdAt.
   */
  async getLatest(
    pipelineId: string,
  ): Promise<BFlowPipelineRunEntity | undefined> {
    const runs = await this.set
      .where("pipelineId")
      .equals(pipelineId)
      .reverse()
      .sortBy("createdAt");
    return runs[0];
  }

  /**
   * Fetch all data for a pipeline run — pipeline run entity, job runs, and step runs.
   * Convenience wrapper for the "Generate Report" flow.
   */
  async getRunWithJobsAndSteps(
    runId: string,
    jobRunRepo: BFlowJobRunRepository,
    stepRunRepo: BFlowStepRunRepository,
  ): Promise<{
    pipelineRun: BFlowPipelineRunEntity | undefined;
    jobRuns: BFlowJobRun[];
    stepRuns: BFlowStepRun[];
  }> {
    const [pipelineRun, jobRuns, stepRuns] = await Promise.all([
      this.set.get(runId),
      jobRunRepo.getByRunId(runId),
      stepRunRepo.getByRunId(runId),
    ]);
    return { pipelineRun, jobRuns, stepRuns };
  }

  /**
   * Get summary list of all runs (without job/step details).
   */
  async getSummaryList(): Promise<BFlowPipelineRunSummary[]> {
    const all = await this.set.toArray();
    return all
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((r) => ({
        id: r.id,
        pipelineId: r.pipelineId,
        pipelineName: "",
        flowId: r.flowId,
        templateId: r.templateId,
        status: r.status,
        runNumber: r.runNumber,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        createdAt: r.createdAt,
      }));
  }
}

// ─── Job Run Repository ────────────────────────────────────────────

export class BFlowJobRunRepository extends PhazeRepository<BFlowJobRun> {
  /**
   * Get all job runs for a specific pipeline run, sorted by execution order.
   */
  async getByRunId(runId: string): Promise<BFlowJobRun[]> {
    const all = await this.set.toArray();
    return all
      .filter((j) => j.runId === runId)
      .sort((a, b) => a.order - b.order);
  }
}

// ─── Step Run Repository ───────────────────────────────────────────

export class BFlowStepRunRepository extends PhazeRepository<BFlowStepRun> {
  /**
   * Get all step runs for a specific job run.
   */
  async getByJobRunId(jobRunId: string): Promise<BFlowStepRun[]> {
    const all = await this.set.toArray();
    return all.filter((s) => s.jobRunId === jobRunId);
  }

  /**
   * Get all step runs for a specific pipeline run.
   */
  async getByRunId(runId: string): Promise<BFlowStepRun[]> {
    const all = await this.set.toArray();
    return all.filter((s) => s.runId === runId);
  }
}
