/**
 * BFlowStepNode — Displays a single step execution node in the pipeline run view.
 *
 * Shows status icon, step info (name, agent, error, output, timing), and action
 * buttons: "View" (step details), "View Output" (react-markdown modal),
 * "View Computed Inputs" (resolved input values modal), and
 * "Rerun" (re-execute a single step with updated prompts).
 */

import React from "react";
import { Eye, FileText, Code, RotateCw } from "lucide-react";
import { Button } from "@heroui/react";
import { BFlowStatusBadge, getStatusConfig } from "./BFlowStatusBadge";
import type { BFlowStep } from "../workflow/BFlowWorkflow.Types";
import type { BFlowStepRun } from "./BFlowRun.Types";

export interface BFlowStepNodeProps {
  /** The workflow step definition */
  step: BFlowStep;
  /** The step run data (optional — null before execution) */
  stepRun?: BFlowStepRun;
  /** Called when the user clicks the "View" (eye) button to open step details */
  onView: (step: BFlowStep, stepRun?: BFlowStepRun) => void;
  /** Called when the user clicks the "View Output" button to open the output modal */
  onViewOutput: (step: BFlowStep, stepRun?: BFlowStepRun) => void;
  /** Called when the user clicks the "View Computed Inputs" button */
  onViewComputedInputs: (step: BFlowStep, stepRun?: BFlowStepRun) => void;
  /**
   * Called when the user clicks the "Rerun" button to re-execute a single step.
   * Receives the job name and step identifier.
   */
  onRerun?: (jobName: string, stepId: string) => void;
  /** The name of the parent job (required for rerun) */
  jobName?: string;
  /** Whether this step is currently being re-run */
  isRerunning?: boolean;
}

/**
 * A single step execution node in the pipeline run flow.
 * Shows status, agent info, error/output snippets, timing, and action buttons.
 */
export function BFlowStepNode({
  step,
  stepRun,
  onView,
  onViewOutput,
  onViewComputedInputs,
  onRerun,
  jobName,
  isRerunning,
}: BFlowStepNodeProps) {
  const status = stepRun?.status ?? "pending";
  const cfg = getStatusConfig(status);

  return (
    <div
      className={`relative flex items-start gap-3 p-4 rounded-xl border transition-all ${cfg.bg} ${
        status === "running" ? "ring-2 ring-primary shadow-md" : ""
      }`}
    >
      {/* Status Icon */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${cfg.color} ${
          status === "running" ? "bg-primary-100" : "bg-background"
        } border ${cfg.color.replace("text-", "border-")}`}
      >
        {cfg.icon}
      </div>

      {/* Step Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground text-sm">
            {step.name}
          </span>
          <BFlowStatusBadge status={status} />
        </div>

        {step.agent && (
          <p className="text-xs text-default-400 mt-0.5">Agent: {step.agent}</p>
        )}

        {stepRun?.error && (
          <p className="text-xs text-danger mt-1 bg-danger-50 p-2 rounded-lg">
            {stepRun.error}
          </p>
        )}

        {stepRun?.output && status === "succeeded" && (
          <p className="text-xs text-default-500 mt-1 line-clamp-2">
            {stepRun.output}
          </p>
        )}

        {/* Timing */}
        {stepRun?.startedAt && (
          <p className="text-xs text-default-400 mt-1">
            {stepRun.completedAt
              ? `Completed in ${Math.round(
                  (stepRun.completedAt.getTime() -
                    stepRun.startedAt.getTime()) /
                    1000,
                )}s`
              : `Started at ${stepRun.startedAt.toLocaleTimeString()}`}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* View Computed Inputs Button */}
        <Button
          variant="ghost"
          size="sm"
          className="min-w-0 px-2 text-default-400"
          onPress={() => onViewComputedInputs(step, stepRun)}
        >
          <Code className="w-4 h-4" />
        </Button>

        {/* View Output Button (only visible when output exists) */}
        {stepRun?.output && (
          <Button
            variant="ghost"
            size="sm"
            className="min-w-0 px-2 text-default-400"
            onPress={() => onViewOutput(step, stepRun)}
          >
            <FileText className="w-4 h-4" />
          </Button>
        )}

        {/* Rerun Step Button (only visible after execution) */}
        {stepRun && onRerun && jobName && (
          <Button
            variant="ghost"
            size="sm"
            className="min-w-0 px-2 text-amber-500 hover:text-amber-700 hover:bg-amber-50"
            isDisabled={isRerunning}
            onPress={() => onRerun(jobName, step.id ?? step.name)}
          >
            <RotateCw
              className={`w-4 h-4 ${isRerunning ? "animate-spin" : ""}`}
            />
          </Button>
        )}

        {/* View Details Button */}
        <Button
          variant="ghost"
          size="sm"
          className="min-w-0 px-2 text-default-400"
          onPress={() => onView(step, stepRun)}
        >
          <Eye className="w-4 h-4" />
        </Button>
      </div>

      {/* Connector line to next step */}
      <div className="absolute -bottom-3 left-6 w-0.5 h-3 bg-default-200" />
    </div>
  );
}
