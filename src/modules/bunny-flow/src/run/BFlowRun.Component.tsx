"use client";

/**
 * BFlowRunComponent — Presentational pipeline run view.
 *
 * All stateful logic is extracted into useBFlowRun() and its sub-hooks.
 * This component only consumes the returned state and renders the UI.
 */

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Play,
  Loader2,
  XCircle,
  Clock,
  FileBarChart,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { Button, Card } from "@heroui/react";
import { useBFlowRun } from "./BFlowRun.Hooks";
import { BFlowStatusBadge, getStatusConfig } from "./BFlowStatusBadge";
import { BFlowStepNode } from "./BFlowStepNode";
import { BFlowStepDetailsModal } from "./BFlowStepDetailsModal";
import { BFlowOutputModal } from "./BFlowOutputModal";
import { BFlowComputedInputsModal } from "./BFlowComputedInputsModal";
import { BFlowLoadingState, BFlowErrorState } from "./BFlowRunState";
import type { BFlowStep } from "../workflow/BFlowWorkflow.Types";
import type { BFlowStepRun } from "./BFlowRun.Types";

export default function BFlowRunComponent() {
  const params = useParams();
  const router = useRouter();

  // Supports both:
  //   pipeline/[pipelineId]/run        → params.id
  //   flow/[flowId]/pipeline/[pipelineId]/run  → params.pipelineId
  const pipelineId = (params?.pipelineId ?? params?.id) as string | undefined;

  const {
    pipeline,
    template,
    variableGroup,
    error,
    clearError,
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
    currentJob,
    currentJobRun,
    currentStepRuns,
    isRunning,
    startPipelineRun,
    generateReport,
  } = useBFlowRun(pipelineId);

  // ── Modal State ───────────────────────────────────────────────
  const [viewOutput, setViewOutput] = useState<{
    step: BFlowStep;
    stepRun?: BFlowStepRun;
  } | null>(null);

  const [viewComputedInputs, setViewComputedInputs] = useState<{
    step: BFlowStep;
    stepRun?: BFlowStepRun;
  } | null>(null);

  // ── Render ────────────────────────────────────────────────────

  if (!pipeline) {
    if (error) return <BFlowErrorState message={error} />;
    if (loading) return <BFlowLoadingState />;
    return <BFlowLoadingState />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-default-50">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-default-100">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onPress={() => router.back()}
                className="text-default-400 min-w-0 px-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-lg font-bold text-foreground">
                  {pipeline.name}
                </h1>
                <p className="text-xs text-default-400">
                  {template?.name ?? "Loading template..."}
                  {variableGroup && ` • ${variableGroup.name}`}
                  {pipeline.slug && ` • ${pipeline.slug}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeRun && <BFlowStatusBadge status={activeRun.status} />}

              <Button
                variant="outline"
                size="sm"
                onPress={generateReport}
                isDisabled={!activeRun}
              >
                <FileBarChart className="w-4 h-4" />
                Generate Report
              </Button>

              <Button
                variant="primary"
                size="sm"
                onPress={startPipelineRun}
                isDisabled={isRunning}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Run Pipeline
                  </>
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="mt-3 bg-danger-50 border border-danger-200 rounded-xl p-3 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-danger flex-shrink-0" />
              <p className="text-sm text-danger">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-danger min-w-0 px-2"
                onPress={clearError}
              >
                Dismiss
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* ── Job Tabs (Sidebar) ──────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="bg-background rounded-2xl border border-default-100 overflow-hidden">
              <div className="p-4 border-b border-default-100">
                <h2 className="text-sm font-semibold text-default-700">Jobs</h2>
                <p className="text-xs text-default-400 mt-0.5">
                  {jobs.length} job{jobs.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="p-2 space-y-1">
                {jobs.map((job, index) => {
                  // Match job run by jobId, falling back to job.name
                  // for templates without explicit IDs in YAML
                  const jobKey = job.id || job.name;
                  const jobRun = jobRuns?.find((jr) => jr.jobId === jobKey);
                  const cfg = getStatusConfig(jobRun?.status);

                  return (
                    <button
                      key={job.id}
                      onClick={() => setSelectedJobIndex(index)}
                      className={`w-full text-left p-3 rounded-xl transition-all ${
                        index === selectedJobIndex
                          ? "bg-success-50 border border-success-200 shadow-sm"
                          : "hover:bg-default-50 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cfg.color}>{cfg.icon}</div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium truncate ${
                              index === selectedJobIndex
                                ? "text-success-700"
                                : "text-default-700"
                            }`}
                          >
                            {job.name}
                          </p>
                          <p className="text-xs text-default-400">
                            {jobRun ? cfg.label : `${job.steps.length} steps`}
                          </p>
                        </div>
                        <ChevronRight
                          className={`w-4 h-4 ${
                            index === selectedJobIndex
                              ? "text-success"
                              : "text-default-300"
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <Card className="mt-4 p-4 bg-background border-default-100">
              <h3 className="text-xs font-semibold text-default-500 uppercase tracking-wider mb-3">
                Run Summary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-default-500">Variables</span>
                  <span className="text-default-700 font-medium">
                    {resolvedVariables.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-default-500">Jobs Run</span>
                  <span className="text-default-700 font-medium">
                    {jobRuns?.length ?? 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-default-500">Steps Executed</span>
                  <span className="text-default-700 font-medium">
                    {stepRuns?.length ?? 0}
                  </span>
                </div>
                {activeRun?.startedAt && (
                  <div className="flex justify-between">
                    <span className="text-default-500">Started</span>
                    <span className="text-default-700 text-xs">
                      {activeRun.startedAt.toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* ── Steps Display ──────────────────────────────────── */}
          <div className="lg:col-span-3">
            {currentJob ? (
              <div>
                {/* Job Header */}
                <div className="bg-background rounded-2xl border border-default-100 p-6 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-foreground">
                        {currentJob.name}
                      </h2>
                      <p className="text-sm text-default-400">
                        {currentJob.steps.length} step
                        {currentJob.steps.length !== 1 ? "s" : ""}
                        {currentJob.agent
                          ? ` • Agent: ${currentJob.agent}`
                          : ""}
                        {currentJobRun?.status
                          ? ` • ${getStatusConfig(currentJobRun.status).label}`
                          : ""}
                      </p>
                    </div>
                    <BFlowStatusBadge status={currentJobRun?.status} />
                  </div>

                  {currentJobRun?.status === "running" && (
                    <div className="w-full bg-default-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-success to-teal-500 h-full rounded-full transition-all duration-500 animate-pulse"
                        style={{
                          width: `${
                            currentStepRuns.length > 0
                              ? (currentStepRuns.filter(
                                  (s) =>
                                    s.status === "succeeded" ||
                                    s.status === "failed" ||
                                    s.status === "skipped",
                                ).length /
                                  currentJob.steps.length) *
                                100
                              : 5
                          }%`,
                        }}
                      />
                    </div>
                  )}
                </div>

                {currentJob.needs && (
                  <div className="bg-warning-50 border border-warning-200 rounded-xl p-3 mb-4 flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-warning" />
                    <span className="text-warning-700">
                      Depends on:{" "}
                      {Array.isArray(currentJob.needs)
                        ? currentJob.needs.join(", ")
                        : currentJob.needs}
                    </span>
                  </div>
                )}

                <div className="space-y-6 relative">
                  <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-default-100" />

                  {currentJob.steps.map((step, stepIdx) => {
                    // Use step.id as primary identifier, falling back to step.name
                    // for templates without explicit IDs in YAML
                    const stepKey = step.id || step.name;
                    const stepRun = currentStepRuns.find(
                      (sr) => sr.stepId === stepKey,
                    );
                    return (
                      <BFlowStepNode
                        key={step.id ?? `step-${stepIdx}-${step.name}`}
                        step={step}
                        stepRun={stepRun}
                        onView={(s, sr) =>
                          setViewStep({ step: s, stepRun: sr })
                        }
                        onViewOutput={(s, sr) =>
                          setViewOutput({ step: s, stepRun: sr })
                        }
                        onViewComputedInputs={(s, sr) =>
                          setViewComputedInputs({ step: s, stepRun: sr })
                        }
                      />
                    );
                  })}

                  {currentStepRuns.length === 0 && !activeRun && (
                    <div className="text-center py-12">
                      <Play className="w-12 h-12 text-default-200 mx-auto mb-4" />
                      <p className="text-default-400 text-sm">
                        Click &ldquo;Run Pipeline&rdquo; to start execution
                      </p>
                    </div>
                  )}
                </div>

                {currentJob.prompt && (
                  <div className="mt-6 bg-default-50 rounded-xl p-4">
                    <h4 className="text-xs font-semibold text-default-500 uppercase tracking-wider mb-2">
                      Job Prompt
                    </h4>
                    <p className="text-sm text-default-600 whitespace-pre-wrap">
                      {currentJob.prompt}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-background rounded-2xl border border-default-100 p-12 text-center">
                <Clock className="w-12 h-12 text-default-200 mx-auto mb-4" />
                <p className="text-default-400">No jobs defined in template</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Step Details Modal ─────────────────────────────────── */}
      {viewStep && (
        <BFlowStepDetailsModal
          open={!!viewStep}
          onClose={() => setViewStep(null)}
          step={viewStep.step}
          stepRun={viewStep.stepRun}
          pipelineVariables={resolvedVariables}
        />
      )}

      {/* ── Output Modal (react-markdown) ──────────────────────── */}
      {viewOutput && (
        <BFlowOutputModal
          open={!!viewOutput}
          onClose={() => setViewOutput(null)}
          step={viewOutput.step}
          stepRun={viewOutput.stepRun}
        />
      )}

      {/* ── Computed Inputs Modal ──────────────────────────────── */}
      {viewComputedInputs && (
        <BFlowComputedInputsModal
          open={!!viewComputedInputs}
          onClose={() => setViewComputedInputs(null)}
          step={viewComputedInputs.step}
          stepRun={viewComputedInputs.stepRun}
        />
      )}
    </div>
  );
}
