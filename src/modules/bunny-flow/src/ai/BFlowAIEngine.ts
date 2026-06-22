/**
 * BFlowAIEngine — Execution Engine for BunnyFlow Pipeline Runs.
 *
 * Orchestrates the execution of pipeline jobs and steps via Helix AI.
 * Manages concurrent job execution respecting `needs` dependencies,
 * tracks state in IndexedDB via BFlowRun repositories.
 *
 * ── Execution Flow ──────────────────────────────────────────────────
 * 1. resolveVariables() — merge pipeline vars + variable group + template defaults
 * 2. executePipeline() — top-level orchestrator
 * 3.   resolveJobDependencies() — topological sort of jobs respecting `needs`
 * 4.   executeJobs() — runs jobs respecting dependencies (concurrent if possible)
 * 5.     executeSteps() — runs steps sequentially within a job
 * 6.       executeStepPrompt() — calls Helix AI for each step
 * 7. collectOutputs() — gathers all job/step outputs for report generation
 */

import { v7 as uuidv7 } from "uuid";
import { bflowDB } from "../database/BFlowDatabase";
import { createHelixFromBFlow } from "../ai-config/BFlowHelixIntegration";
import type { BFlowPipelineEntity } from "../pipeline/BFlowPipeline.Types";
import type {
  BFlowWorkflowTemplateEntity,
  BFlowWorkflowJob,
  BFlowStep,
} from "../workflow/BFlowWorkflow.Types";
import type { BFlowVariableGroupEntity } from "../variable/BFlowVariableGroup.Types";
import type { BFlowFlowVariableEntity } from "../flow-variable/BFlowFlowVariable.Types";
import type { BFlowPipelineVariable } from "../pipeline/BFlowPipeline.Types";
import {
  BFlowPipelineRunEntity,
  BFlowJobRun,
  BFlowStepRun,
  BFlowRunStatus,
} from "../run/BFlowRun.Types";

// ─── Types ─────────────────────────────────────────────────────────

export interface BFlowExecutionResult {
  runId: string;
  success: boolean;
  error?: string;
  jobResults: BFlowJobExecutionResult[];
}

export interface BFlowJobExecutionResult {
  jobName: string;
  jobId: string;
  success: boolean;
  error?: string;
  stepResults: BFlowStepExecutionResult[];
}

export interface BFlowStepExecutionResult {
  stepName: string;
  stepId: string;
  success: boolean;
  error?: string;
  output?: string;
}

// ─── Engine ────────────────────────────────────────────────────────

export class BFlowAIEngine {
  /**
   * Execute an entire pipeline run.
   * Creates the pipeline run record, resolves variables, and orchestrates jobs.
   */
  async executePipeline(pipeline: BFlowPipelineEntity): Promise<BFlowExecutionResult> {
    const now = new Date();

    // ── 1. Create pipeline run record ──────────────────────────────
    const runId = uuidv7();
    const pipelineRun: BFlowPipelineRunEntity = {
      id: runId,
      pipelineId: pipeline.id,
      flowId: pipeline.flowId,
      templateId: pipeline.templateId,
      variableGroupId: pipeline.variableGroupId,
      status: "running" as BFlowRunStatus,
      prompt: pipeline.prompt,
      variablesSnapshot: [],
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await bflowDB.pipelineRunsRepo.create(pipelineRun);

    try {
      // ── 2. Resolve variables ────────────────────────────────────
      const resolvedVars = await this.resolveVariables(pipeline);

      // Update run with variable snapshot
      await bflowDB.pipelineRuns.update(runId, {
        variablesSnapshot: resolvedVars,
        updatedAt: new Date(),
      });

      // ── 3. Load workflow template ───────────────────────────────
      const template = await bflowDB.workflowTemplates.get(pipeline.templateId);
      if (!template) {
        throw new Error(`Workflow template not found: ${pipeline.templateId}`);
      }

      // ── 4. Resolve job execution order ──────────────────────────
      const jobs = this.resolveJobExecutionOrder(template.template.jobs);

      // ── 5. Execute jobs ─────────────────────────────────────────
      const jobResults = await this.executeJobs(
        runId,
        pipeline,
        template,
        jobs,
        resolvedVars,
      );

      // ── 6. Determine overall status ─────────────────────────────
      const allSucceeded = jobResults.every((jr) => jr.success);
      const anyFailed = jobResults.some((jr) => !jr.success);

      const finalStatus: BFlowRunStatus = anyFailed
        ? "failed"
        : allSucceeded
          ? "succeeded"
          : "cancelled";

      await bflowDB.pipelineRuns.update(runId, {
        status: finalStatus,
        completedAt: new Date(),
        updatedAt: new Date(),
      } as Partial<BFlowPipelineRunEntity>);

      return {
        runId,
        success: finalStatus === "succeeded",
        error: anyFailed
          ? jobResults.find((jr) => !jr.success)?.error
          : undefined,
        jobResults,
      };
    } catch (error) {
      // Mark run as failed
      const errorMessage =
        error instanceof Error ? error.message : "Unknown pipeline execution error";
      await bflowDB.pipelineRuns.update(runId, {
        status: "failed" as BFlowRunStatus,
        error: errorMessage,
        completedAt: new Date(),
        updatedAt: new Date(),
      } as Partial<BFlowPipelineRunEntity>);

      return {
        runId,
        success: false,
        error: errorMessage,
        jobResults: [],
      };
    }
  }

  /**
   * Resolve variables by merging:
   * 1. Variable group variables (flow-level)
   * 2. Pipeline-level variables (overrides group)
   * 3. Workflow template default variables
   */
  private async resolveVariables(
    pipeline: BFlowPipelineEntity,
  ): Promise<BFlowPipelineVariable[]> {
    const merged = new Map<string, BFlowPipelineVariable>();

    // Load variable group
    if (pipeline.variableGroupId) {
      const group = await bflowDB.variableGroups.get(pipeline.variableGroupId);
      if (group) {
        const groupVars = await bflowDB.flowVariables
          .where("groupId")
          .equals(group.id)
          .toArray();
        for (const v of groupVars) {
          merged.set(v.name, {
            id: v.id,
            name: v.name,
            value: v.value,
            type: v.type,
            description: v.description,
          });
        }
      }
    }

    // Pipeline variables override group variables
    if (pipeline.variables) {
      for (const v of pipeline.variables) {
        merged.set(v.name, v);
      }
    }

    return Array.from(merged.values());
  }

  /**
   * Resolve job execution order based on `needs` dependencies.
   * Returns jobs in topological order grouped by dependency level.
   * Jobs with no dependencies run first (level 0), then level 1, etc.
   */
  private resolveJobExecutionOrder(
    jobs: BFlowWorkflowJob[],
  ): { level: number; jobs: BFlowWorkflowJob[] }[] {
    const jobMap = new Map(jobs.map((j) => [j.name, j]));

    // Build dependency graph
    const levels: { level: number; jobs: BFlowWorkflowJob[] }[] = [];
    const visited = new Set<string>();
    let currentLevel = 0;

    const getLevel = (jobName: string): number => {
      if (visited.has(jobName)) {
        // Find existing level
        for (const l of levels) {
          if (l.jobs.some((j) => j.name === jobName)) {
            return l.level;
          }
        }
        return 0;
      }

      const job = jobMap.get(jobName);
      if (!job) return 0;

      if (!job.needs || job.needs.length === 0) {
        return 0;
      }

      const needs = Array.isArray(job.needs) ? job.needs : [job.needs];
      let maxDepLevel = -1;
      for (const need of needs) {
        const depLevel = getLevel(need.trim());
        maxDepLevel = Math.max(maxDepLevel, depLevel);
      }
      return maxDepLevel + 1;
    };

    for (const job of jobs) {
      if (!visited.has(job.name)) {
        const level = getLevel(job.name);
        let levelGroup = levels.find((l) => l.level === level);
        if (!levelGroup) {
          levelGroup = { level, jobs: [] };
          levels.push(levelGroup);
        }
        levelGroup.jobs.push(job);
        visited.add(job.name);
      }
    }

    return levels.sort((a, b) => a.level - b.level);
  }

  /**
   * Execute jobs respecting dependency levels.
   * Jobs at the same level run concurrently, levels execute sequentially.
   */
  private async executeJobs(
    runId: string,
    pipeline: BFlowPipelineEntity,
    template: BFlowWorkflowTemplateEntity,
    jobLevels: { level: number; jobs: BFlowWorkflowJob[] }[],
    resolvedVars: BFlowPipelineVariable[],
  ): Promise<BFlowJobExecutionResult[]> {
    const allResults: BFlowJobExecutionResult[] = [];

    for (const level of jobLevels) {
      // Execute all jobs at this level concurrently
      const levelResults = await Promise.all(
        level.jobs.map((job) =>
          this.executeJob(runId, pipeline, template, job, resolvedVars, allResults),
        ),
      );
      allResults.push(...levelResults);
    }

    return allResults;
  }

  /**
   * Execute a single job's steps sequentially.
   */
  private async executeJob(
    runId: string,
    pipeline: BFlowPipelineEntity,
    template: BFlowWorkflowTemplateEntity,
    job: BFlowWorkflowJob,
    resolvedVars: BFlowPipelineVariable[],
    previousResults: BFlowJobExecutionResult[],
  ): Promise<BFlowJobExecutionResult> {
    const jobRunId = uuidv7();
    const now = new Date();

    // Check dependencies — if a needed job failed, skip this job
    if (job.needs) {
      const needs = Array.isArray(job.needs) ? job.needs : [job.needs];
      for (const need of needs) {
        const needResult = previousResults.find((r) => r.jobName === need.trim());
        if (needResult && !needResult.success) {
          // Mark job as skipped
          const skippedJobRun: BFlowJobRun = {
            id: jobRunId,
            runId,
            jobId: job.id!,
            jobName: job.name,
            status: "skipped",
            prompt: job.prompt,
            needs: job.needs,
            variablesSnapshot: resolvedVars,
            agent: job.agent,
            order: 0,
            createdAt: now,
            updatedAt: now,
          };
          await bflowDB.jobRunsRepo.create(skippedJobRun);

          return {
            jobName: job.name,
            jobId: job.id!,
            success: false,
            error: `Skipped: dependency "${need}" failed`,
            stepResults: [],
          };
        }
      }
    }

    // Get AI config for this job
    const helix = await createHelixFromBFlow({
      pipelineId: pipeline.id,
      flowId: pipeline.flowId,
    });

    const model = helix.getModel();

    // Create job run record
    const jobRun: BFlowJobRun = {
      id: jobRunId,
      runId,
      jobId: job.id!,
      jobName: job.name,
      status: "running",
      prompt: job.prompt,
      needs: job.needs,
      variablesSnapshot: resolvedVars,
      agent: job.agent,
      aiProvider: "helix",
      aiModel: model,
      startedAt: now,
      order: 0,
      createdAt: now,
      updatedAt: now,
    };
    await bflowDB.jobRunsRepo.create(jobRun);

    try {
      // Execute steps sequentially
      const stepResults = await this.executeSteps(
        runId,
        jobRunId,
        pipeline,
        job,
        resolvedVars,
        helix,
      );

      const allSucceeded = stepResults.every((sr) => sr.success);
      const anyFailed = stepResults.some((sr) => !sr.success);

      const jobStatus: BFlowRunStatus = anyFailed ? "failed" : "succeeded";

      await bflowDB.jobRuns.update(jobRunId, {
        status: jobStatus,
        completedAt: new Date(),
        updatedAt: new Date(),
      } as Partial<BFlowJobRun>);

      return {
        jobName: job.name,
        jobId: job.id!,
        success: jobStatus === "succeeded",
        error: anyFailed
          ? stepResults.find((sr) => !sr.success)?.error
          : undefined,
        stepResults,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown job execution error";
      await bflowDB.jobRuns.update(jobRunId, {
        status: "failed",
        error: errorMessage,
        completedAt: new Date(),
        updatedAt: new Date(),
      } as Partial<BFlowJobRun>);

      return {
        jobName: job.name,
        jobId: job.id!,
        success: false,
        error: errorMessage,
        stepResults: [],
      };
    }
  }

  /**
   * Execute all steps in a job sequentially.
   */
  private async executeSteps(
    runId: string,
    jobRunId: string,
    pipeline: BFlowPipelineEntity,
    job: BFlowWorkflowJob,
    resolvedVars: BFlowPipelineVariable[],
    helix: Awaited<ReturnType<typeof createHelixFromBFlow>>,
  ): Promise<BFlowStepExecutionResult[]> {
    const results: BFlowStepExecutionResult[] = [];
    const stepContext: Record<string, unknown> = {};

    for (let i = 0; i < job.steps.length; i++) {
      const step = job.steps[i];
      const stepRunId = uuidv7();
      const now = new Date();

      // Resolve inputs from step context
      const resolvedInputs = this.resolveStepInputs(step, resolvedVars, stepContext);

      // Create step run record
      const stepRun: BFlowStepRun = {
        id: stepRunId,
        jobRunId,
        runId,
        stepId: step.id!,
        stepName: step.name,
        status: "running",
        agent: step.agent || job.agent,
        prompts: step.prompts,
        aiProvider: "helix",
        aiModel: helix.getModel(),
        computedVariables: resolvedVars,
        resolvedInputs,
        startedAt: now,
        createdAt: now,
        updatedAt: now,
      };
      await bflowDB.stepRunsRepo.create(stepRun);

      try {
        // Check skip conditions
        if (step.skipIf && step.skipIf.length > 0) {
          const shouldSkip = this.evaluateSkipConditions(step.skipIf, stepContext);
          if (shouldSkip) {
            await bflowDB.stepRuns.update(stepRunId, {
              status: "skipped",
              completedAt: new Date(),
              updatedAt: new Date(),
            } as Partial<BFlowStepRun>);
            results.push({
              stepName: step.name,
              stepId: step.id!,
              success: true,
              output: "Skipped",
            });
            continue;
          }
        }

        // Build the step prompt
        const systemPrompt = `You are executing step "${step.name}" in job "${job.name}" of a pipeline.
${step.prompts ? `\nInstructions: ${Array.isArray(step.prompts) ? step.prompts.join("\n") : step.prompts}` : ""}

${job.prompt ? `\nJob Context: ${job.prompt}` : ""}
${pipeline.prompt ? `\nPipeline Context: ${pipeline.prompt}` : ""}

${resolvedVars.length > 0 ? `\nAvailable variables:\n${resolvedVars.map((v) => `  ${v.name} = ${v.value}`).join("\n")}` : ""}

${Object.keys(resolvedInputs).length > 0 ? `\nResolved inputs:\n${JSON.stringify(resolvedInputs, null, 2)}` : ""}`;

        const userPrompt = `Execute step "${step.name}" and provide the output.`;

        // Execute via Helix AI
        const output = await helix.doChat({
          system: systemPrompt,
          user: userPrompt,
        });

        // Store output in context for subsequent steps
        stepContext[`steps.${step.name}.output`] = output;
        if (step.output && step.output.length > 0) {
          for (const outMode of step.output) {
            stepContext[`steps.${step.name}.outputs.${outMode.name}`] = output;
          }
        }

        // Update step run record
        await bflowDB.stepRuns.update(stepRunId, {
          status: "succeeded",
          output,
          completedAt: new Date(),
          updatedAt: new Date(),
        } as Partial<BFlowStepRun>);

        results.push({
          stepName: step.name,
          stepId: step.id!,
          success: true,
          output,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown step execution error";
        await bflowDB.stepRuns.update(stepRunId, {
          status: "failed",
          error: errorMessage,
          completedAt: new Date(),
          updatedAt: new Date(),
        } as Partial<BFlowStepRun>);

        results.push({
          stepName: step.name,
          stepId: step.id!,
          success: false,
          error: errorMessage,
        });

        // Stop executing further steps in this job on failure
        break;
      }
    }

    return results;
  }

  /**
   * Resolve step inputs from variable context.
   */
  private resolveStepInputs(
    step: BFlowStep,
    variables: BFlowPipelineVariable[],
    stepContext: Record<string, unknown>,
  ): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};

    if (!step.inputs) return resolved;

    const varMap = new Map(variables.map((v) => [v.name, v.value]));

    for (const input of step.inputs) {
      // Source patterns:
      // - {job}.{step}.outputs.{name}
      // - vars.{name}
      const source = input.source;

      if (source.startsWith("vars.")) {
        const varName = source.replace("vars.", "");
        resolved[input.name] = varMap.get(varName) || "";
      } else if (source.includes(".outputs.")) {
        // e.g., "job-1.step-1.outputs.result"
        resolved[input.name] = stepContext[source] || "";
      } else {
        // Try direct context lookup
        resolved[input.name] = stepContext[source] || "";
      }
    }

    return resolved;
  }

  /**
   * Evaluate skip conditions for a step.
   */
  private evaluateSkipConditions(
    conditions: Array<{
      inputs: string;
      condition: string;
      value: string | number | boolean;
    }>,
    _stepContext: Record<string, unknown>,
  ): boolean {
    // For now, a simple evaluation. Can be extended with more complex logic.
    return false;
  }

  /**
   * Collect all outputs from a pipeline run for report generation.
   */
  async collectOutputs(runId: string): Promise<{
    pipelineRun: BFlowPipelineRunEntity | undefined;
    jobRuns: BFlowJobRun[];
    stepRuns: BFlowStepRun[];
  }> {
    const pipelineRun = await bflowDB.pipelineRuns.get(runId);
    const jobRuns = await bflowDB.jobRunsRepo.getByRunId(runId);
    const stepRuns = await bflowDB.stepRunsRepo.getByRunId(runId);

    return { pipelineRun, jobRuns, stepRuns };
  }
}

// ─── Singleton ─────────────────────────────────────────────────────

export const bflowAIEngine = new BFlowAIEngine();
