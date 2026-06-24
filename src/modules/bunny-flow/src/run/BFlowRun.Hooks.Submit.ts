/**
 * BFlowRun.Hooks.Submit — Custom React hook for pipeline execution and report generation.
 *
 * Separates execution logic (pipeline submission, step execution, report generation)
 * from the presentation layer. Supports both the fluent section‑based prompt builder
 * (default) and the Handlebars‑driven TemplateBar builder.
 */

"use client";

import { useCallback, useMemo, useState } from "react";
import { v7 as uuidv7 } from "uuid";
import { bflowDB } from "../database/BFlowDatabase";
import {
  executeStepChatAction,
  type PipelineExecutionRequest,
  type StepExecutionRequest,
} from "./BFlowRun.Actions";
import { bflowRunDB } from "./BFlowRunDB";
import { BFlowRunPromptBuilder } from "./BFlowRun.SectionBuilder";
import { BFlowRunPromptTemplateBar } from "./BFlowRun.Prompt.TemplateBar";
import {
  BFlowRunInputResolver,
  InputResolutionError,
  type ResolvedStepInput,
} from "./BFlowRun.InputResolver";
import type { IBFlowRunPromptBuilder } from "./BFlowRun.Prompt.Types";
import { BFlowPromptBuilderKind } from "./BFlowRun.Prompt.Types";
import type {
  BFlowPipelineEntity,
  BFlowPipelineVariable,
} from "../pipeline/BFlowPipeline.Types";
import type {
  BFlowWorkflowTemplateEntity,
} from "../workflow/BFlowWorkflow.Entity";
import type {
  BFlowWorkflowJob,
} from "../workflow/BFlowWorkflow.Types";
import type {
  BFlowPipelineRunEntity,
  BFlowJobRun,
  BFlowStepRun,
  BFlowRunStatus,
} from "./BFlowRun.Types";

// ─── Shared instances ──────────────────────────────────────────────

const inputResolver = new BFlowRunInputResolver();

/**
 * Resolve the prompt builder strategy based on the pipeline entity's
 * metadata configuration. Falls back to the section builder if no
 * strategy is specified.
 *
 * The strategy can be stored in `pipeline.metadata.promptBuilderKind`.
 */
function resolvePromptBuilder(
  pipeline?: BFlowPipelineEntity,
): IBFlowRunPromptBuilder {
  const kind = (pipeline?.metadata as Record<string, unknown> | undefined)
    ?.promptBuilderKind;

  if (kind === BFlowPromptBuilderKind.TemplateBar) {
    return new BFlowRunPromptTemplateBar();
  }

  return new BFlowRunPromptBuilder();
}

// ═══════════════════════════════════════════════════════════════════
// useBFlowRunSubmit — pipeline execution + report generation
// ═══════════════════════════════════════════════════════════════════

export interface BFlowRunSubmitState {
  /** Whether a pipeline run is currently in progress */
  isRunning: boolean;
  /** Kicks off a new pipeline run via the server action */
  startPipelineRun: () => Promise<void>;
  /** Generates a markdown report for the last completed run */
  generateReport: () => Promise<void>;
}

/**
 * Provides pipeline execution and report generation callbacks.
 *
 * - `startPipelineRun`: resolves AI config, builds prompts via
 *   `BFlowRunPromptBuilder`, calls the server action, and writes
 *   results to IndexedDB.
 * - `generateReport`: reads run data from IndexedDB and triggers a
 *   markdown file download.
 */
export function useBFlowRunSubmit(
  pipeline: BFlowPipelineEntity | undefined,
  template: BFlowWorkflowTemplateEntity | undefined,
  jobs: BFlowWorkflowJob[],
  resolvedVariables: BFlowPipelineVariable[],
  activeRun: BFlowPipelineRunEntity | undefined,
  onRunUpdate: (run: BFlowPipelineRunEntity | undefined) => void,
  onRunDataUpdate: (jobRuns: BFlowJobRun[], stepRuns: BFlowStepRun[]) => void,
  onError: (error: string | null) => void,
): BFlowRunSubmitState {
  const [isRunning, setIsRunning] = useState(false);

  // ── Resolve prompt builder based on pipeline metadata ──────────────
  const promptBuilder = useMemo<IBFlowRunPromptBuilder>(
    () => resolvePromptBuilder(pipeline),
    [pipeline?.id, pipeline?.metadata],
  );

  // ── Start Pipeline Run ─────────────────────────────────────────

  const startPipelineRun = useCallback(async () => {
    if (!pipeline || isRunning || !template) return;

    setIsRunning(true);
    onError(null);

    const now = new Date();
    const runId = uuidv7();
    const completedStepRuns: BFlowStepRun[] = [];
    const completedJobRuns: BFlowJobRun[] = [];

    try {
      // 1. Create pipeline run record in IndexedDB
      const pipelineRun: BFlowPipelineRunEntity = {
        id: runId,
        pipelineId: pipeline.id,
        flowId: pipeline.flowId,
        templateId: pipeline.templateId,
        variableGroupId: pipeline.variableGroupId,
        status: "running",
        prompt: pipeline.prompt,
        variablesSnapshot: resolvedVariables,
        startedAt: now,
        createdAt: now,
        updatedAt: now,
      };
      await bflowDB.pipelineRunsRepo.create(pipelineRun);
      onRunUpdate(pipelineRun);

      // 2. Resolve AI config
      const aiConfig = await promptBuilder.resolveAIConfig(pipeline);

      // 3. Build input resolution context
      const variableMap = inputResolver.buildVariableMap(resolvedVariables);
      const stepOutputs = inputResolver.buildEmptyStepOutputs();

      const resolutionContext = {
        variables: variableMap,
        stepOutputs,
        jobs,
      };

      let anyFailed = false;
      let globalError: string | undefined;

      // 4. Execute jobs sequentially (each job's steps may reference
      //    previous job/step outputs)
      for (let jIdx = 0; jIdx < jobs.length; jIdx++) {
        const job = jobs[jIdx];
        const jobRunId = uuidv7();
        const jobStartedAt = new Date();

        try {
          // Create job run record in pending status
          // Use job.id as primary identifier, falling back to job.name
          // for templates without explicit IDs in YAML
          const jobId = job.id || job.name;
          const jobRun: BFlowJobRun = {
            id: jobRunId,
            runId,
            jobId,
            jobName: job.name,
            status: "running",
            prompt: job.prompt,
            needs: job.needs,
            variablesSnapshot: resolvedVariables,
            agent: job.agent,
            aiProvider: aiConfig?.provider,
            aiModel: aiConfig?.model,
            order: jIdx,
            startedAt: jobStartedAt,
            createdAt: now,
            updatedAt: jobStartedAt,
          };
          await bflowDB.jobRunsRepo.create(jobRun);
          completedJobRuns.push(jobRun);

          // 5. Execute steps sequentially within the job
          let jobStepFailed = false;
          for (let sIdx = 0; sIdx < job.steps.length; sIdx++) {
            const step = job.steps[sIdx];
            const stepStartedAt = new Date();

            // 5a. Resolve inputs for this step
            let resolvedInputs: ResolvedStepInput[] = [];
            try {
              resolvedInputs = inputResolver.resolveStepInputs(
                step,
                job,
                resolutionContext,
              );
            } catch (inputErr) {
              // Wrap input resolution errors with step context
              const message =
                inputErr instanceof InputResolutionError
                  ? inputErr.message
                  : `Failed to resolve inputs for step "${step.name}": ${
                      inputErr instanceof Error
                        ? inputErr.message
                        : "Unknown error"
                    }`;

              // Write failed step run to DB
              const failedStepRun: BFlowStepRun = {
                id: uuidv7(),
                jobRunId,
                runId,
                stepId: step.id!,
                stepName: step.name,
                status: "failed",
                agent: step.agent || job.agent,
                prompts: step.prompts,
                aiProvider: aiConfig?.provider,
                aiModel: aiConfig?.model,
                computedVariables: resolvedVariables,
                resolvedInputs: {},
                error: message,
                startedAt: stepStartedAt,
                completedAt: new Date(),
                createdAt: now,
                updatedAt: new Date(),
              };
              await bflowDB.stepRunsRepo.create(failedStepRun);
              completedStepRuns.push(failedStepRun);

              anyFailed = true;
              globalError = message;

              // Update job run as failed
              await bflowDB.jobRuns.update(jobRunId, {
                status: "failed" as BFlowRunStatus,
                error: message,
                completedAt: new Date(),
                updatedAt: new Date(),
              } as Partial<BFlowJobRun>);

              // Stop executing further steps in this job
              break;
            }

            // Build a resolvedInputs record for the step run
            const resolvedInputsRecord: Record<string, string> = {};
            for (const ri of resolvedInputs) {
              resolvedInputsRecord[ri.name] = ri.value;
            }

            // 5b. Build prompts with resolved inputs
            const systemPrompt = promptBuilder.buildStepSystemPrompt(
              step,
              job,
              pipeline,
              resolvedVariables,
              resolvedInputs,
            );
            const userPrompt = promptBuilder.buildUserPrompt(
              step,
              resolvedInputs,
            );

            // 5c. Execute step via server action
            const stepRequest: StepExecutionRequest = {
              stepId: step.id!,
              stepName: step.name,
              systemPrompt,
              userPrompt,
              aiConfig,
              resolvedInputs: resolvedInputsRecord,
            };

            const stepResult = await executeStepChatAction(stepRequest);
            const stepCompletedAt = new Date();
            const stepStatus: BFlowRunStatus = stepResult.success
              ? "succeeded"
              : "failed";

            // 5d. Write step run to IndexedDB with resolved inputs and prompts
            // Use step.id as the primary identifier, falling back to step.name
            // for templates that don't define explicit IDs in YAML
            const stepId = step.id || step.name;
            const stepRun: BFlowStepRun = {
              id: uuidv7(),
              jobRunId,
              runId,
              stepId,
              stepName: step.name,
              status: stepStatus,
              agent: step.agent || job.agent,
              prompts: step.prompts,
              aiProvider: aiConfig?.provider,
              aiModel: aiConfig?.model,
              computedVariables: resolvedVariables,
              resolvedInputs: resolvedInputsRecord,
              resolvedSystemPrompt: systemPrompt,
              resolvedUserPrompt: userPrompt,
              output: stepResult.output || undefined,
              error: stepResult.error,
              startedAt: stepStartedAt,
              completedAt: stepCompletedAt,
              createdAt: now,
              updatedAt: stepCompletedAt,
            };
            // Parse structured output if the step defines output modes
            let structuredOutput: Record<string, unknown> | undefined;
            if (stepResult.success && stepResult.output && step.output) {
              structuredOutput = inputResolver.parseStructuredOutput(
                stepResult.output,
                step.output,
              );
            }

            // Update step run with structured output
            stepRun.structuredOutput = structuredOutput;

            await bflowDB.stepRunsRepo.create(stepRun);
            completedStepRuns.push(stepRun);

            // 5e. Register step output for downstream step references
            //     Includes both raw output and structured named outputs
            if (stepResult.success && stepResult.output) {
              inputResolver.registerStepOutput(
                stepOutputs,
                job.name,
                step.name,
                stepResult.output,
                structuredOutput,
              );
            }

            // 5f. If step failed, mark job as failed and stop
            if (!stepResult.success) {
              anyFailed = true;
              jobStepFailed = true;
              globalError = stepResult.error || `Step "${step.name}" failed`;
              await bflowDB.jobRuns.update(jobRunId, {
                status: "failed" as BFlowRunStatus,
                error: globalError,
                completedAt: stepCompletedAt,
                updatedAt: stepCompletedAt,
              } as Partial<BFlowJobRun>);
              break;
            }

            // 5g. After all steps complete, mark job as succeeded
            //     (job is only marked failed inside the step loop or catch block)
            if (!jobStepFailed) {
              const jobCompletedAt = new Date();
              await bflowDB.jobRuns.update(jobRunId, {
                status: "succeeded" as BFlowRunStatus,
                completedAt: jobCompletedAt,
                updatedAt: jobCompletedAt,
              } as Partial<BFlowJobRun>);
            }

            // 5h. Immediately refresh UI state after job completes so
            //     the sidebar, job list, and step list update without
            //     waiting for the 2-second polling interval
            try {
              const [latestJobs, latestSteps] = await Promise.all([
                bflowRunDB.getJobRunsForRun(runId),
                bflowRunDB.getStepRunsForRun(runId),
              ]);
              onRunDataUpdate(latestJobs, latestSteps);
            } catch {
              // Refresh is best-effort — polling will catch up
            }
          }
        } catch (jobErr) {
          const message =
            jobErr instanceof Error
              ? jobErr.message
              : `Job "${job.name}" execution failed`;
          anyFailed = true;
          globalError = message;
          try {
            await bflowDB.jobRuns.update(jobRunId, {
              status: "failed" as BFlowRunStatus,
              error: message,
              completedAt: new Date(),
              updatedAt: new Date(),
            } as Partial<BFlowJobRun>);
          } catch {
            // Ignore secondary errors
          }
        }
      }

      // 6. Update pipeline run status
      const pipelineCompletedAt = new Date();
      const finalStatus: BFlowRunStatus = anyFailed ? "failed" : "succeeded";
      await bflowDB.pipelineRuns.update(runId, {
        status: finalStatus,
        error: globalError,
        completedAt: pipelineCompletedAt,
        updatedAt: pipelineCompletedAt,
      } as Partial<BFlowPipelineRunEntity>);

      // 7. Refresh state
      const updatedRun = await bflowRunDB.getLatestPipelineRun(pipeline.id);
      onRunUpdate(updatedRun);

      const [latestJobs, latestSteps] = await Promise.all([
        bflowRunDB.getJobRunsForRun(runId),
        bflowRunDB.getStepRunsForRun(runId),
      ]);
      onRunDataUpdate(latestJobs, latestSteps);

      if (anyFailed && globalError) {
        onError(globalError);
      }
    } catch (err) {
      try {
        await bflowDB.pipelineRuns.update(runId, {
          status: "failed" as BFlowRunStatus,
          error: err instanceof Error ? err.message : "Unknown error",
          completedAt: new Date(),
          updatedAt: new Date(),
        } as Partial<BFlowPipelineRunEntity>);
      } catch {
        // Ignore secondary errors
      }
      onError(
        err instanceof Error ? err.message : "Failed to start pipeline run",
      );
    } finally {
      setIsRunning(false);
    }
  }, [
    pipeline,
    template,
    isRunning,
    jobs,
    resolvedVariables,
    onRunUpdate,
    onRunDataUpdate,
    onError,
  ]);

  // ── Generate Report ────────────────────────────────────────────

  const generateReport = useCallback(async () => {
    if (!activeRun?.id || !pipeline) return;

    try {
      const { pipelineRun, jobRuns, stepRuns } =
        await bflowRunDB.getRunDataForReport(activeRun.id);

      const reportLines: string[] = [
        `# Pipeline Run Report: ${pipeline.name}`,
        "",
        `**Status**: ${pipelineRun?.status ?? activeRun.status}`,
        `**Run ID**: ${activeRun.id}`,
        `**Started**: ${activeRun.startedAt?.toLocaleString() ?? "N/A"}`,
        `**Completed**: ${activeRun.completedAt?.toLocaleString() ?? "N/A"}`,
        "",
        "---",
        "",
      ];

      for (const jobRun of jobRuns) {
        reportLines.push(`## Job: ${jobRun.jobName}`);
        reportLines.push(`**Status**: ${jobRun.status}`);
        reportLines.push("");
        reportLines.push("### Steps");
        reportLines.push("");

        const jobStepRuns = stepRuns.filter((sr) => sr.jobRunId === jobRun.id);

        for (const stepRun of jobStepRuns) {
          reportLines.push(`#### ${stepRun.stepName}`);
          reportLines.push(`- **Status**: ${stepRun.status}`);
          reportLines.push(
            `- **Duration**: ${
              stepRun.startedAt && stepRun.completedAt
                ? `${Math.round(
                    (stepRun.completedAt.getTime() -
                      stepRun.startedAt.getTime()) /
                      1000,
                  )}s`
                : "N/A"
            }`,
          );
          if (stepRun.output) {
            reportLines.push("");
            reportLines.push("```");
            reportLines.push(stepRun.output);
            reportLines.push("```");
          }
          if (stepRun.error) {
            reportLines.push("");
            reportLines.push("**Error**:");
            reportLines.push("```");
            reportLines.push(stepRun.error);
            reportLines.push("```");
          }
          reportLines.push("");
        }
      }

      const markdown = reportLines.join("\n");

      const blob = new Blob([markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pipeline-run-${pipeline.name
        .toLowerCase()
        .replace(/\s+/g, "-")}-${activeRun.id.slice(0, 8)}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to generate report");
    }
  }, [activeRun, pipeline, onError]);

  return { isRunning, startPipelineRun, generateReport };
}
