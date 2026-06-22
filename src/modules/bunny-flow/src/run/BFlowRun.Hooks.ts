/**
 * BFlowRun.Hooks — Custom React hooks for BunnyFlow pipeline run orchestration.
 *
 * Separates all stateful logic (data loading, polling, execution, report generation)
 * from the presentation layer so the component remains stateless and testable.
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { v7 as uuidv7 } from "uuid";
import { bflowDB } from "../database/BFlowDatabase";
import {
  executeStepChatAction,
  type PipelineExecutionRequest,
  type StepExecutionRequest,
} from "./BFlowRun.Actions";
import { bflowRunDB } from "./BFlowRunDB";
import { BFlowRunPromptBuilder } from "./BFlowRun.Prompt";
import {
  BFlowRunInputResolver,
  InputResolutionError,
  type ResolvedStepInput,
} from "./BFlowRun.InputResolver";
import type {
  BFlowPipelineEntity,
  BFlowPipelineVariable,
} from "../pipeline/BFlowPipeline.Types";
import type { BFlowVariableGroupEntity } from "../variable/BFlowVariableGroup.Types";
import type { BFlowFlowVariableEntity } from "../flow-variable/BFlowFlowVariable.Types";
import type {
  BFlowWorkflowTemplateEntity,
  BFlowWorkflowJob,
  BFlowStep,
} from "../workflow/BFlowWorkflow.Types";
import type {
  BFlowPipelineRunEntity,
  BFlowJobRun,
  BFlowStepRun,
  BFlowRunStatus,
} from "./BFlowRun.Types";

// ─── Shared instances ──────────────────────────────────────────────

const promptBuilder = new BFlowRunPromptBuilder();
const inputResolver = new BFlowRunInputResolver();

// ═══════════════════════════════════════════════════════════════════
// useBFlowRunDataLoad — loads pipeline, template, variables
// ═══════════════════════════════════════════════════════════════════

export interface BFlowRunDataLoadState {
  pipeline: BFlowPipelineEntity | undefined;
  template: BFlowWorkflowTemplateEntity | undefined;
  variableGroup: BFlowVariableGroupEntity | undefined;
  flowVariables: BFlowFlowVariableEntity[];
  error: string | null;
  loading: boolean;
}

/**
 * Loads the pipeline entity, its workflow template, variable group,
 * and flow-level variables from IndexedDB. Returns all together so
 * the component only needs to consume the result.
 */
export function useBFlowRunDataLoad(
  pipelineId: string | undefined,
): BFlowRunDataLoadState {
  const [pipeline, setPipeline] = useState<BFlowPipelineEntity | undefined>();
  const [template, setTemplate] = useState<BFlowWorkflowTemplateEntity | undefined>();
  const [variableGroup, setVariableGroup] = useState<BFlowVariableGroupEntity | undefined>();
  const [flowVariables, setFlowVariables] = useState<BFlowFlowVariableEntity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load pipeline
  useEffect(() => {
    if (!pipelineId) {
      setPipeline(undefined);
      setError("Pipeline ID not found in URL");
      setLoading(false);
      return;
    }
    let cancelled = false;
    bflowDB.pipelines
      .get(pipelineId)
      .then((p) => {
        if (cancelled) return;
        if (!p) {
          setError(`Pipeline not found (${pipelineId})`);
        } else {
          setPipeline(p);
        }
      })
      .catch((e) => {
        if (!cancelled)
          setError(
            `Failed to load pipeline: ${e instanceof Error ? e.message : "Unknown error"}`,
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pipelineId]);

  // Load template when pipeline changes
  useEffect(() => {
    if (!pipeline?.templateId) {
      setTemplate(undefined);
      return;
    }
    let cancelled = false;
    bflowDB.workflowTemplates
      .get(pipeline.templateId)
      .then((t) => {
        if (!cancelled) setTemplate(t);
      })
      .catch((e) => {
        if (!cancelled)
          setError(
            `Failed to load template: ${e instanceof Error ? e.message : "Unknown error"}`,
          );
      });
    return () => {
      cancelled = true;
    };
  }, [pipeline?.templateId]);

  // Load variable group when pipeline changes
  useEffect(() => {
    if (!pipeline?.variableGroupId) {
      setVariableGroup(undefined);
      return;
    }
    let cancelled = false;
    bflowDB.variableGroups
      .get(pipeline.variableGroupId)
      .then((g) => {
        if (!cancelled) setVariableGroup(g);
      })
      .catch((e) => {
        if (!cancelled)
          setError(
            `Failed to load variable group: ${e instanceof Error ? e.message : "Unknown error"}`,
          );
      });
    return () => {
      cancelled = true;
    };
  }, [pipeline?.variableGroupId]);

  // Load flow variables when variable group changes
  useEffect(() => {
    if (!variableGroup?.id) {
      setFlowVariables([]);
      return;
    }
    let cancelled = false;
    bflowDB.flowVariables
      .where("groupId")
      .equals(variableGroup.id)
      .toArray()
      .then((vars) => {
        if (!cancelled) setFlowVariables(vars);
      })
      .catch((e) => {
        if (!cancelled)
          setError(
            `Failed to load flow variables: ${e instanceof Error ? e.message : "Unknown error"}`,
          );
      });
    return () => {
      cancelled = true;
    };
  }, [variableGroup?.id]);

  return { pipeline, template, variableGroup, flowVariables, error, loading };
}

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
          const jobRun: BFlowJobRun = {
            id: jobRunId,
            runId,
            jobId: job.id!,
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
              globalError = stepResult.error || `Step "${step.name}" failed`;
              await bflowDB.jobRuns.update(jobRunId, {
                status: "failed" as BFlowRunStatus,
                error: globalError,
                completedAt: stepCompletedAt,
                updatedAt: stepCompletedAt,
              } as Partial<BFlowJobRun>);
              break;
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
      const finalStatus: BFlowRunStatus = anyFailed
        ? "failed"
        : "succeeded";
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

        const jobStepRuns = stepRuns.filter(
          (sr) => sr.jobRunId === jobRun.id,
        );

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
      onError(
        err instanceof Error ? err.message : "Failed to generate report",
      );
    }
  }, [activeRun, pipeline, onError]);

  return { isRunning, startPipelineRun, generateReport };
}

// ═══════════════════════════════════════════════════════════════════
// useBFlowRun — composite hook
// ═══════════════════════════════════════════════════════════════════

export interface BFlowRunState {
  /** Loaded pipeline entity */
  pipeline: BFlowPipelineEntity | undefined;
  /** Loaded workflow template */
  template: BFlowWorkflowTemplateEntity | undefined;
  /** Loaded variable group */
  variableGroup: BFlowVariableGroupEntity | undefined;
  /** Data load error */
  error: string | null;
  /** Clear any error messages */
  clearError: () => void;
  /** Whether initial data is still loading */
  loading: boolean;

  /** Jobs from the template (derived) */
  jobs: BFlowWorkflowJob[];
  /** Resolved pipeline + group variables (derived) */
  resolvedVariables: BFlowPipelineVariable[];

  /** Currently selected job tab index */
  selectedJobIndex: number;
  /** Set the selected job tab */
  setSelectedJobIndex: (index: number) => void;

  /** Step detail modal state */
  viewStep: { step: BFlowStep; stepRun?: BFlowStepRun } | null;
  /** Open/close step detail modal */
  setViewStep: (
    value: { step: BFlowStep; stepRun?: BFlowStepRun } | null,
  ) => void;

  /** Active pipeline run (latest) */
  activeRun: BFlowPipelineRunEntity | undefined;
  /** Job runs for the active pipeline run */
  jobRuns: BFlowJobRun[];
  /** Step runs for the active pipeline run */
  stepRuns: BFlowStepRun[];
  /** Whether initial run data has been loaded */
  initialLoadDone: boolean;

  /** Current job for the selected tab */
  currentJob: BFlowWorkflowJob | undefined;
  /** Current job run for the selected tab */
  currentJobRun: BFlowJobRun | undefined;
  /** Step runs for the current job */
  currentStepRuns: BFlowStepRun[];

  /** Whether a pipeline run is in progress */
  isRunning: boolean;
  /** Start a new pipeline execution */
  startPipelineRun: () => Promise<void>;
  /** Generate and download a markdown report */
  generateReport: () => Promise<void>;
}

/**
 * Top-level hook that composes all data loading, polling, and execution
 * logic into a single state object consumed by the presentational component.
 */
export function useBFlowRun(
  pipelineId: string | undefined,
): BFlowRunState {
  // ── Data loading ──────────────────────────────────────────────
  const {
    pipeline,
    template,
    variableGroup,
    flowVariables,
    error: loadError,
    loading,
  } = useBFlowRunDataLoad(pipelineId);

  // ── Polling ───────────────────────────────────────────────────
  const { activeRun, jobRuns, stepRuns, initialLoadDone, refreshRunData } =
    useBFlowRunPolling(pipelineId);

  // ── Local state ───────────────────────────────────────────────
  const [selectedJobIndex, setSelectedJobIndex] = useState(0);
  const [viewStep, setViewStep] = useState<{
    step: BFlowStep;
    stepRun?: BFlowStepRun;
  } | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // Merge load error with local error
  const error = loadError ?? localError;

  // ── Derived data ──────────────────────────────────────────────

  const jobs: BFlowWorkflowJob[] = useMemo(
    () => template?.template?.jobs ?? [],
    [template],
  );

  const currentJob = jobs[selectedJobIndex];

  const currentJobRun = useMemo(
    () => jobRuns?.find((jr) => jr.jobId === currentJob?.id),
    [jobRuns, currentJob],
  );

  const currentStepRuns = useMemo(
    () => stepRuns?.filter((sr) => sr.jobRunId === currentJobRun?.id) ?? [],
    [stepRuns, currentJobRun?.id],
  );

  const resolvedVariables: BFlowPipelineVariable[] = useMemo(() => {
    const vars: BFlowPipelineVariable[] = [];

    // 1. Base layer: template/YAML variable defaults (lowest priority)
    //    These come from the YAML workflow schema's `variables` key.
    //    YAML variables use `defaultValue`; we map it to `value`.
    if (template?.template?.variables) {
      for (const tv of template.template.variables) {
        vars.push({
          id: tv.id ?? `template-${tv.name}`,
          name: tv.name,
          value: tv.defaultValue,
          type: tv.type,
          description: tv.description,
        });
      }
    }

    // 2. Override layer: flow variables from the variable group (medium priority)
    if (flowVariables) {
      for (const fv of flowVariables) {
        const idx = vars.findIndex((v) => v.name === fv.name);
        if (idx >= 0) {
          vars[idx] = {
            id: fv.id,
            name: fv.name,
            value: fv.value,
            type: fv.type,
            description: fv.description,
          };
        } else {
          vars.push({
            id: fv.id,
            name: fv.name,
            value: fv.value,
            type: fv.type,
            description: fv.description,
          });
        }
      }
    }

    // 3. Override layer: pipeline-level variables (highest priority)
    if (pipeline?.variables) {
      for (const pv of pipeline.variables) {
        const idx = vars.findIndex((v) => v.name === pv.name);
        if (idx >= 0) {
          vars[idx] = pv;
        } else {
          vars.push(pv);
        }
      }
    }

    return vars;
  }, [template?.template?.variables, flowVariables, pipeline?.variables]);

  // ── Callbacks for submission hook ─────────────────────────────

  const onRunUpdate = useCallback(
    (_run: BFlowPipelineRunEntity | undefined) => {
      // Immediately refresh all run data from DB after pipeline execution completes,
      // bypassing the 2-second polling interval delay.
      refreshRunData();
    },
    [refreshRunData],
  );

  const onRunDataUpdate = useCallback(
    (_jobRuns: BFlowJobRun[], _stepRuns: BFlowStepRun[]) => {
      // Immediately refresh all run data from DB after pipeline execution completes,
      // bypassing the 2-second polling interval delay.
      refreshRunData();
    },
    [refreshRunData],
  );

  const onError = useCallback((err: string | null) => {
    setLocalError(err);
  }, []);

  // ── Submit hook ───────────────────────────────────────────────
  const { isRunning, startPipelineRun, generateReport } = useBFlowRunSubmit(
    pipeline,
    template,
    jobs,
    resolvedVariables,
    activeRun,
    onRunUpdate,
    onRunDataUpdate,
    onError,
  );

  // ── Effects ───────────────────────────────────────────────────

  // Reset selection on pipeline change
  useEffect(() => {
    setSelectedJobIndex(0);
    setViewStep(null);
  }, [pipelineId]);

  // Auto-select job tab based on job runs
  useEffect(() => {
    if (jobRuns.length > 0 && jobs.length > 0) {
      const runningJob = jobRuns.find(
        (jr) => jr.status === "running" || jr.status === "pending",
      );
      if (runningJob) {
        const idx = jobs.findIndex((j) => j.id === runningJob.jobId);
        if (idx >= 0) setSelectedJobIndex(idx);
      }
    }
  }, [jobRuns, jobs]);

  return {
    pipeline,
    template,
    variableGroup,
    error,
    clearError: () => setLocalError(null),
    loading,
    jobs,
    resolvedVariables,
    selectedJobIndex,
    setSelectedJobIndex,
    viewStep,
    setViewStep,
    activeRun,
    jobRuns,
    stepRuns,
    initialLoadDone,
    currentJob,
    currentJobRun,
    currentStepRuns,
    isRunning,
    startPipelineRun,
    generateReport,
  };
}
