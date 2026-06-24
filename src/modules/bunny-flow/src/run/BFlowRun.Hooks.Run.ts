/**
 * BFlowRun.Hooks.Run — Composite hook that orchestrates all pipeline run hooks.
 *
 * Assembles data loading, polling, submission, and derived state into a single
 * consumable object for the presentation layer.
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useBFlowRunDataLoad } from "./BFlowRun.Hooks.DataLoad";
import { useBFlowRunPolling } from "./BFlowRun.Hooks.Polling";
import { useBFlowRunSubmit } from "./BFlowRun.Hooks.Submit";
import type {
  BFlowPipelineEntity,
  BFlowPipelineVariable,
} from "../pipeline/BFlowPipeline.Types";
import type { BFlowVariableGroupEntity } from "../variable/BFlowVariableGroup.Types";
import type { BFlowFlowVariableEntity } from "../flow-variable/BFlowFlowVariable.Types";
import type {
  BFlowWorkflowTemplateEntity,
} from "../workflow/BFlowWorkflow.Entity";
import type {
  BFlowWorkflowJob,
  BFlowStep,
} from "../workflow/BFlowWorkflow.Types";
import type {
  BFlowPipelineRunEntity,
  BFlowJobRun,
  BFlowStepRun,
} from "./BFlowRun.Types";

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
export function useBFlowRun(pipelineId: string | undefined): BFlowRunState {
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

  const currentJobRun = useMemo(() => {
    // Match by jobId, falling back to job.name for templates without IDs
    const jobKey = currentJob?.id || currentJob?.name;
    return jobKey ? jobRuns?.find((jr) => jr.jobId === jobKey) : undefined;
  }, [jobRuns, currentJob]);

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
