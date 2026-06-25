/**
 * BFlowRun.Hooks.TestRun — In-memory pipeline test execution hook.
 *
 * Mirrors the execution logic from useBFlowRunSubmit but stores all results
 * in React state instead of IndexedDB. This allows users to test-run a
 * workflow while building it, without persisting any output to the database.
 *
 * The test run state is ephemeral — it lives only in the browser's memory
 * and is discarded on page navigation or refresh. Users can iterate rapidly
 * by modifying their workflow and clicking "Test Run" again.
 */

"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { v7 as uuidv7 } from "uuid";
import {
  executeStepChatAction,
  type StepExecutionRequest,
} from "./BFlowRun.Actions";
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
import type { BFlowWorkflowTemplateEntity } from "../workflow/BFlowWorkflow.Entity";
import type { BFlowWorkflowJob } from "../workflow/BFlowWorkflow.Types";
import type {
  BFlowPipelineRunEntity,
  BFlowJobRun,
  BFlowStepRun,
  BFlowRunStatus,
} from "./BFlowRun.Types";

// ─── Shared instances ──────────────────────────────────────────────

const inputResolver = new BFlowRunInputResolver();

/**
 * Resolve the prompt builder strategy (same as useBFlowRunSubmit).
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
// useBFlowTestRun — in-memory pipeline test execution
// ═══════════════════════════════════════════════════════════════════

export interface BFlowTestRunState {
  /**
   * The in-memory pipeline run entity (mirrors structure but never persisted).
   * Undefined when no test run has been performed.
   */
  testRun: BFlowPipelineRunEntity | undefined;
  /** In-memory job runs for the current test run */
  testJobRuns: BFlowJobRun[];
  /** In-memory step runs for the current test run */
  testStepRuns: BFlowStepRun[];
  /** Whether a test run is currently in progress */
  isTestRunning: boolean;
  /** Error message from the last test run (cleared on next test run) */
  testError: string | null;
  /** Set of step IDs currently being re-run */
  rerunningSteps: Set<string>;
  /** Kick off a new test run — executes the pipeline in-memory only */
  startTestRun: () => Promise<void>;
  /**
   * Re-run a single step with the current (updated) prompt from the editor.
   * This reads the fresh prompt from the jobs/steps array rather than using
   * the cached version from the previous run, enabling rapid iteration.
   *
   * @param jobName   The job containing the step
   * @param stepId    The step ID to re-run
   * @returns         Promise that resolves when the step re-run completes
   */
  rerunStep: (jobName: string, stepId: string) => Promise<void>;
  /** Clear all test run state (results, errors) */
  clearTestRun: () => void;
}

/**
 * Provides in-memory pipeline test execution.
 *
 * - `startTestRun`: resolves AI config, builds prompts, calls the server
 *   action to execute AI chat, and **stores all results in React state**
 *   without writing to IndexedDB.
 * - `clearTestRun`: resets all test run state so the UI returns to idle.
 *
 * Designed to sit alongside `useBFlowRunSubmit` — users can test iteratively
 * without polluting the database until they're ready for an actual run.
 */
export function useBFlowTestRun(
  pipeline: BFlowPipelineEntity | undefined,
  template: BFlowWorkflowTemplateEntity | undefined,
  jobs: BFlowWorkflowJob[],
  resolvedVariables: BFlowPipelineVariable[],
): BFlowTestRunState {
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testRun, setTestRun] = useState<BFlowPipelineRunEntity | undefined>();
  const [testJobRuns, setTestJobRuns] = useState<BFlowJobRun[]>([]);
  const [testStepRuns, setTestStepRuns] = useState<BFlowStepRun[]>([]);
  const [testError, setTestError] = useState<string | null>(null);
  const [rerunningSteps, setRerunningSteps] = useState<Set<string>>(new Set());

  // ── Track cancelled state for async safety ──────────────────────
  const cancelledRef = useRef(false);
  // ── Ref to hold latest jobs so rerunStep always reads updated prompts ─
  const jobsRef = useRef<BFlowWorkflowJob[]>(jobs);
  jobsRef.current = jobs;

  // ── Resolve prompt builder based on pipeline metadata ────────────
  const promptBuilder = useMemo<IBFlowRunPromptBuilder>(
    () => resolvePromptBuilder(pipeline),
    [pipeline?.id, pipeline?.metadata],
  );

  // ── Clear test run ──────────────────────────────────────────────
  const clearTestRun = useCallback(() => {
    setTestRun(undefined);
    setTestJobRuns([]);
    setTestStepRuns([]);
    setTestError(null);
    setRerunningSteps(new Set());
  }, []);

  // ── Re-run a single step ────────────────────────────────────────
  const rerunStep = useCallback(
    async (jobName: string, stepId: string) => {
      // Resolve the step and job from the LATEST jobs array (reads updated prompts)
      const currentJobs = jobsRef.current;
      const job = currentJobs.find((j) => j.name === jobName);
      if (!job) {
        setTestError(`Job "${jobName}" not found.`);
        return;
      }

      const step = job.steps.find((s) => s.id === stepId || s.name === stepId);
      if (!step) {
        setTestError(`Step "${stepId}" not found in job "${jobName}".`);
        return;
      }

      if (!pipeline || !template) return;

      // Mark step as re-running
      setRerunningSteps((prev) => new Set(prev).add(stepId));

      // Clear previous error for this step
      setTestError(null);

      const now = new Date();
      const runId = testRun?.id ?? uuidv7();
      const stepStartedAt = new Date();

      try {
        // 1. Resolve AI config
        const aiConfig = await promptBuilder.resolveAIConfig(pipeline);

        // 2. Build input resolution context from existing test run outputs
        const variableMap = inputResolver.buildVariableMap(resolvedVariables);
        const stepOutputs = inputResolver.buildEmptyStepOutputs();

        // Rebuild step outputs from previous step runs (except the one being re-run)
        for (const existingStepRun of testStepRuns) {
          if (
            existingStepRun.stepName === step.name &&
            existingStepRun.jobRunId ===
              testJobRuns.find((jr) => jr.jobName === jobName)?.id
          ) {
            // Skip the step being re-run — it will get fresh output
            continue;
          }
          if (existingStepRun.output) {
            const jobRun = testJobRuns.find(
              (jr) => jr.id === existingStepRun.jobRunId,
            );
            const jName = jobRun?.jobName ?? jobName;
            inputResolver.registerStepOutput(
              stepOutputs,
              jName,
              existingStepRun.stepName,
              existingStepRun.output,
              existingStepRun.structuredOutput,
            );
          }
        }

        const resolutionContext = {
          variables: variableMap,
          stepOutputs,
          jobs: currentJobs,
        };

        // Find the existing job run or create a new one
        let jobRun = testJobRuns.find((jr) => jr.jobName === jobName);
        const jobRunId = jobRun?.id ?? uuidv7();

        // 3. Resolve inputs for this step (reads updated variables)
        let resolvedInputs: ResolvedStepInput[] = [];
        try {
          resolvedInputs = inputResolver.resolveStepInputs(
            step,
            job,
            resolutionContext,
          );
        } catch (inputErr) {
          const message =
            inputErr instanceof InputResolutionError
              ? inputErr.message
              : `Failed to resolve inputs: ${
                  inputErr instanceof Error ? inputErr.message : "Unknown error"
                }`;

          // Update the step run with error
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

          // Replace the old step run or append
          setTestStepRuns((prev) => {
            const filtered = prev.filter(
              (sr) => !(sr.stepName === step.name && sr.jobRunId === jobRunId),
            );
            return [...filtered, failedStepRun];
          });

          setTestError(message);
          return;
        }

        // Build resolvedInputs record
        const resolvedInputsRecord: Record<string, string> = {};
        for (const ri of resolvedInputs) {
          resolvedInputsRecord[ri.name] = ri.value;
        }

        // 4. Build prompts with resolved inputs (uses LATEST YAML prompts)
        const systemPrompt = promptBuilder.buildStepSystemPrompt(
          step,
          job,
          pipeline,
          resolvedVariables,
          resolvedInputs,
        );
        const userPrompt = promptBuilder.buildUserPrompt(step, resolvedInputs);

        // 5. Execute step via server action
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

        // 6. Create/update step run
        const stepRun: BFlowStepRun = {
          id: uuidv7(),
          jobRunId,
          runId,
          stepId: step.id!,
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

        // Parse structured output if applicable
        let structuredOutput: Record<string, unknown> | undefined;
        if (stepResult.success && stepResult.output && step.output) {
          structuredOutput = inputResolver.parseStructuredOutput(
            stepResult.output,
            step.output,
          );
        }
        stepRun.structuredOutput = structuredOutput;

        // Replace old step run with new one
        setTestStepRuns((prev) => {
          const filtered = prev.filter(
            (sr) => !(sr.stepName === step.name && sr.jobRunId === jobRunId),
          );
          return [...filtered, stepRun];
        });

        // 7. Register step output for downstream references
        if (stepResult.success && stepResult.output) {
          inputResolver.registerStepOutput(
            stepOutputs,
            job.name,
            step.name,
            stepResult.output,
            structuredOutput,
          );
        }

        // 8. Ensure job run exists in state
        if (!jobRun) {
          const newJobRun: BFlowJobRun = {
            id: jobRunId,
            runId,
            jobId: job.id!,
            jobName: job.name,
            status: stepResult.success ? "running" : "failed",
            prompt: job.prompt,
            needs: job.needs,
            variablesSnapshot: resolvedVariables,
            agent: job.agent,
            aiProvider: aiConfig?.provider,
            aiModel: aiConfig?.model,
            error: stepResult.error,
            order: jobsRef.current.indexOf(job),
            startedAt: stepStartedAt,
            completedAt: stepResult.success ? undefined : stepCompletedAt,
            createdAt: now,
            updatedAt: stepCompletedAt,
          };
          setTestJobRuns((prev) => [...prev, newJobRun]);
        }

        if (stepResult.error) {
          setTestError(stepResult.error);
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : `Failed to re-run step "${step.name}"`;
        setTestError(message);
      } finally {
        setRerunningSteps((prev) => {
          const next = new Set(prev);
          next.delete(stepId);
          return next;
        });
      }
    },
    [
      pipeline,
      template,
      testRun,
      testStepRuns,
      testJobRuns,
      resolvedVariables,
      promptBuilder,
    ],
  );

  // ── Start Test Run (in-memory) ──────────────────────────────────
  const startTestRun = useCallback(async () => {
    if (!pipeline || isTestRunning || !template) return;

    setIsTestRunning(true);
    setTestError(null);
    cancelledRef.current = false;

    const now = new Date();
    const runId = uuidv7();
    const completedStepRuns: BFlowStepRun[] = [];
    const completedJobRuns: BFlowJobRun[] = [];

    try {
      // 1. Create in-memory pipeline run (no DB write)
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
      setTestRun(pipelineRun);

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

      // 4. Execute jobs sequentially
      for (let jIdx = 0; jIdx < jobs.length; jIdx++) {
        if (cancelledRef.current) break;

        const job = jobs[jIdx];
        const jobRunId = uuidv7();
        const jobStartedAt = new Date();

        try {
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
          completedJobRuns.push(jobRun);
          setTestJobRuns([...completedJobRuns]);

          // 5. Execute steps sequentially within the job
          let jobStepFailed = false;
          for (let sIdx = 0; sIdx < job.steps.length; sIdx++) {
            if (cancelledRef.current) break;

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
              const message =
                inputErr instanceof InputResolutionError
                  ? inputErr.message
                  : `Failed to resolve inputs for step "${step.name}": ${
                      inputErr instanceof Error
                        ? inputErr.message
                        : "Unknown error"
                    }`;

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
              completedStepRuns.push(failedStepRun);
              setTestStepRuns([...completedStepRuns]);

              anyFailed = true;
              globalError = message;

              // Mark job as failed in-memory
              const failedJobRun: BFlowJobRun = {
                ...jobRun,
                status: "failed" as BFlowRunStatus,
                error: message,
                completedAt: new Date(),
                updatedAt: new Date(),
              };
              const jrIdx = completedJobRuns.findIndex(
                (jr) => jr.id === jobRunId,
              );
              if (jrIdx >= 0) {
                completedJobRuns[jrIdx] = failedJobRun;
              }
              setTestJobRuns([...completedJobRuns]);

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

            // 5d. Create in-memory step run (no DB write)
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
            stepRun.structuredOutput = structuredOutput;

            completedStepRuns.push(stepRun);
            setTestStepRuns([...completedStepRuns]);

            // 5e. Register step output for downstream step references
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

              const failedJobRun: BFlowJobRun = {
                ...jobRun,
                status: "failed" as BFlowRunStatus,
                error: globalError,
                completedAt: stepCompletedAt,
                updatedAt: stepCompletedAt,
              };
              const jrIdx = completedJobRuns.findIndex(
                (jr) => jr.id === jobRunId,
              );
              if (jrIdx >= 0) {
                completedJobRuns[jrIdx] = failedJobRun;
              }
              setTestJobRuns([...completedJobRuns]);
              break;
            }
          }

          // 5g. If all steps succeeded, mark job as succeeded
          if (!jobStepFailed && !cancelledRef.current) {
            const jobCompletedAt = new Date();
            const succeededJobRun: BFlowJobRun = {
              ...jobRun,
              status: "succeeded" as BFlowRunStatus,
              completedAt: jobCompletedAt,
              updatedAt: jobCompletedAt,
            };
            const jrIdx = completedJobRuns.findIndex(
              (jr) => jr.id === jobRunId,
            );
            if (jrIdx >= 0) {
              completedJobRuns[jrIdx] = succeededJobRun;
            }
            setTestJobRuns([...completedJobRuns]);
          }
        } catch (jobErr) {
          const message =
            jobErr instanceof Error
              ? jobErr.message
              : `Job "${job.name}" execution failed`;
          anyFailed = true;
          globalError = message;
        }
      }

      // 6. Update pipeline run status
      if (!cancelledRef.current) {
        const pipelineCompletedAt = new Date();
        const finalStatus: BFlowRunStatus = anyFailed ? "failed" : "succeeded";
        const completedRun: BFlowPipelineRunEntity = {
          ...pipelineRun,
          status: finalStatus,
          error: globalError,
          completedAt: pipelineCompletedAt,
          updatedAt: pipelineCompletedAt,
        };
        setTestRun(completedRun);

        if (anyFailed && globalError) {
          setTestError(globalError);
        }
      }
    } catch (err) {
      if (!cancelledRef.current) {
        const failedRun: BFlowPipelineRunEntity = {
          id: runId,
          pipelineId: pipeline.id,
          flowId: pipeline.flowId,
          templateId: pipeline.templateId,
          variableGroupId: pipeline.variableGroupId,
          status: "failed" as BFlowRunStatus,
          prompt: pipeline.prompt,
          variablesSnapshot: resolvedVariables,
          error: err instanceof Error ? err.message : "Unknown error",
          completedAt: new Date(),
          createdAt: now,
          updatedAt: new Date(),
        };
        setTestRun(failedRun);
        setTestError(
          err instanceof Error ? err.message : "Failed to execute test run",
        );
      }
    } finally {
      if (!cancelledRef.current) {
        setIsTestRunning(false);
      }
    }
  }, [
    pipeline,
    template,
    isTestRunning,
    jobs,
    resolvedVariables,
    promptBuilder,
  ]);

  return {
    testRun,
    testJobRuns,
    testStepRuns,
    isTestRunning,
    testError,
    rerunningSteps,
    startTestRun,
    rerunStep,
    clearTestRun,
  };
}
