/**
 * BFlowWorkflowStudio.GenerativeMenu.Step — AI-assisted step generation modal.
 *
 * Extracted from `BFlowWorkflowStudio.GenerativeMenu` so the step-generation
 * surface (job picker + AI generation + apply) lives in its own module.
 *
 * The modal lets the user:
 *   1. Pick the jobs to generate steps for (search, quick-select helpers).
 *   2. Provide an optional direction for the AI.
 *   3. Choose whether generated steps append to or override existing steps.
 *   4. Generate steps via `bflowWorkflowGenerateSteps` and apply them to YAML.
 */

"use client";

import React, { useCallback, useId, useMemo, useState } from "react";
import { Button, Input, Label, TextArea } from "@heroui/react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ListTree,
  Loader2,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import type {
  BFlowStep,
  BFlowVariable,
  BFlowWorkflowJob,
} from "../workflow/BFlowWorkflow.Types";
import {
  bflowWorkflowGenerateSteps,
  type BFlowStepGenerationStrategy,
} from "../workflow/BFlowWorkflow.GenerateSteps.Server";
import type { GenerativeMenuModalProps } from "./BFlowWorkflowStudio.GenerativeMenu";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

export interface GenerateStepsModalProps extends GenerativeMenuModalProps {
  open: boolean;
}

// ═══════════════════════════════════════════════════════════════════════
// GenerateStepsModal
// ═══════════════════════════════════════════════════════════════════════

export function GenerateStepsModal({
  open,
  yamlContent,
  jobs,
  onYamlUpdate,
  onClose,
}: GenerateStepsModalProps) {
  const [selectedJobNames, setSelectedJobNames] = useState<Set<string>>(
    new Set(),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [userDescription, setUserDescription] = useState("");
  const [strategy, setStrategy] =
    useState<BFlowStepGenerationStrategy>("append");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedJobs, setGeneratedJobs] = useState<BFlowWorkflowJob[] | null>(
    null,
  );
  const [generatedStepsByJob, setGeneratedStepsByJob] = useState<Record<
    string,
    BFlowStep[]
  > | null>(null);
  const [missingVariables, setMissingVariables] = useState<BFlowVariable[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchLabelId = useId();
  const directionLabelId = useId();

  /** Filtered jobs — matched against name, prompt and agent. */
  const filteredJobs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return jobs;
    return jobs.filter((job) => {
      const haystack = [
        job.name,
        job.prompt ?? "",
        job.agent ?? "",
        Array.isArray(job.needs) ? job.needs.join(" ") : (job.needs ?? ""),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [jobs, searchQuery]);

  const jobsWithoutSteps = useMemo(
    () => jobs.filter((job) => (job.steps ?? []).length === 0),
    [jobs],
  );

  const selectedCount = selectedJobNames.size;
  const allFilteredSelected = useMemo(
    () =>
      filteredJobs.length > 0 &&
      filteredJobs.every((job) => selectedJobNames.has(job.name)),
    [filteredJobs, selectedJobNames],
  );

  const hasExistingStepsAmongSelected = useMemo(
    () =>
      jobs.some(
        (job) =>
          selectedJobNames.has(job.name) && (job.steps ?? []).length > 0,
      ),
    [jobs, selectedJobNames],
  );

  // ── Job selection helpers ──────────────────────────────────────────

  const toggleJob = useCallback((jobName: string) => {
    setSelectedJobNames((prev) => {
      const next = new Set(prev);
      if (next.has(jobName)) {
        next.delete(jobName);
      } else {
        next.add(jobName);
      }
      return next;
    });
  }, []);

  const toggleAllFiltered = useCallback(() => {
    setSelectedJobNames((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const job of filteredJobs) next.delete(job.name);
      } else {
        for (const job of filteredJobs) next.add(job.name);
      }
      return next;
    });
  }, [allFilteredSelected, filteredJobs]);

  const selectJobsWithoutSteps = useCallback(() => {
    setSelectedJobNames(new Set(jobsWithoutSteps.map((j) => j.name)));
  }, [jobsWithoutSteps]);

  const clearSelection = useCallback(() => setSelectedJobNames(new Set()), []);

  // ── Generation ─────────────────────────────────────────────────────

  const resetGenerated = useCallback(() => {
    setGeneratedJobs(null);
    setGeneratedStepsByJob(null);
    setMissingVariables([]);
    setResult(null);
    setError(null);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (selectedJobNames.size === 0) {
      setError("Please select at least one job to generate steps for.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);
    setGeneratedJobs(null);
    setGeneratedStepsByJob(null);
    setMissingVariables([]);

    try {
      const parsed = parseYaml(yamlContent) as Record<string, unknown> | null;

      const response = await bflowWorkflowGenerateSteps({
        workflowName: (parsed?.name as string) ?? "Unnamed Workflow",
        workflowDescription: (parsed?.description as string) ?? "",
        existingYaml: yamlContent,
        jobNames: [...selectedJobNames],
        userDescription: userDescription.trim(),
        strategy,
      });

      setGeneratedJobs(response.jobs);
      setGeneratedStepsByJob(response.stepsByJob);
      setMissingVariables(response.missingVariables);
      setResult(response.summary);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate steps",
      );
    } finally {
      setIsGenerating(false);
    }
  }, [yamlContent, selectedJobNames, userDescription, strategy]);

  const handleApply = useCallback(() => {
    if (!generatedJobs) return;

    try {
      const parsed = parseYaml(yamlContent);
      const updatedParsed = { ...parsed };

      updatedParsed.jobs = generatedJobs;

      if (missingVariables.length > 0) {
        const existingVars: BFlowVariable[] = parsed?.variables ?? [];
        const existingVarNames = new Set(existingVars.map((v) => v.name));
        const uniqueNewVars = missingVariables.filter(
          (v) => !existingVarNames.has(v.name),
        );
        if (uniqueNewVars.length > 0) {
          updatedParsed.variables = [...existingVars, ...uniqueNewVars];
        }
      }

      const newYaml = stringifyYaml(updatedParsed, {
        indent: 2,
        lineWidth: -1,
      });

      onYamlUpdate(newYaml);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to apply generated steps",
      );
    }
  }, [
    generatedJobs,
    missingVariables,
    yamlContent,
    onYamlUpdate,
    onClose,
  ]);

  /** Compact per-job preview of the generated steps. */
  const stepsPreview = useMemo(() => {
    if (!generatedStepsByJob) return null;
    const entries = Object.entries(generatedStepsByJob);
    if (entries.length === 0) return null;
    return entries
      .map(([jobName, steps]) => {
        const stepLines = steps
          .map((step) => {
            const agentInfo = step.agent ? ` [agent: ${step.agent}]` : "";
            return `      · ${step.name}${agentInfo}`;
          })
          .join("\n");
        return `  • ${jobName} (${steps.length} step${steps.length !== 1 ? "s" : ""})\n${stepLines}`;
      })
      .join("\n");
  }, [generatedStepsByJob]);

  if (!open) return null;

  const canGenerate = selectedCount > 0 && !isGenerating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-default-100">
          <div className="flex items-center gap-2">
            <ListTree className="w-5 h-5 text-teal-500" />
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Generate Steps
              </h3>
              <p className="text-xs text-default-400 mt-0.5">
                AI-assisted step generation and agent assignment for jobs
              </p>
            </div>
          </div>
          <Button
            onPress={onClose}
            variant="ghost"
            size="sm"
            className="text-default-400 h-8 w-8 min-w-0 p-0"
          >
            ✕
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Job selection */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs font-medium">
                Jobs
                {selectedCount > 0 && (
                  <span className="ml-2 text-[10px] font-semibold text-teal-600 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5">
                    {selectedCount} selected
                  </span>
                )}
              </Label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleAllFiltered}
                  disabled={filteredJobs.length === 0}
                  className="text-[10px] font-medium text-default-500 hover:text-teal-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {allFilteredSelected ? "Deselect all" : "Select all"}
                </button>
                <span className="text-default-200">|</span>
                <button
                  type="button"
                  onClick={selectJobsWithoutSteps}
                  disabled={jobsWithoutSteps.length === 0}
                  className="text-[10px] font-medium text-default-500 hover:text-teal-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Without steps
                </button>
                <span className="text-default-200">|</span>
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={selectedCount === 0}
                  className="text-[10px] font-medium text-default-500 hover:text-danger disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-default-400 pointer-events-none" />
              <Input
                aria-labelledby={searchLabelId}
                placeholder="Search jobs by name, agent or prompt..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 text-xs"
                disabled={isGenerating}
              />
              <Label id={searchLabelId} className="sr-only">
                Search jobs
              </Label>
            </div>

            {/* Job list */}
            <div className="max-h-[260px] overflow-y-auto space-y-1.5 pr-0.5">
              {filteredJobs.length === 0 ? (
                <p className="text-xs text-default-400 text-center py-6">
                  {jobs.length === 0
                    ? "No jobs found in this workflow."
                    : "No jobs match your search."}
                </p>
              ) : (
                filteredJobs.map((job) => {
                  const isSelected = selectedJobNames.has(job.name);
                  const stepCount = (job.steps ?? []).length;
                  const needs = Array.isArray(job.needs)
                    ? job.needs
                    : job.needs
                      ? [job.needs]
                      : [];
                  return (
                    <button
                      key={job.name}
                      type="button"
                      onClick={() => toggleJob(job.name)}
                      disabled={isGenerating}
                      className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs transition-all ${
                        isSelected
                          ? "bg-teal-50 border-teal-200"
                          : "bg-background border-default-200 hover:bg-default-50"
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`mt-0.5 w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-teal-600 border-teal-600 text-white"
                              : "border-default-300 bg-background"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-medium truncate ${
                                isSelected
                                  ? "text-teal-800"
                                  : "text-default-700"
                              }`}
                            >
                              {job.name}
                            </span>
                            <span
                              className={`text-[10px] rounded-full px-1.5 py-0.5 border shrink-0 ${
                                stepCount > 0
                                  ? "text-default-500 border-default-200 bg-default-50"
                                  : "text-amber-600 border-amber-200 bg-amber-50"
                              }`}
                            >
                              {stepCount > 0
                                ? `${stepCount} step${stepCount !== 1 ? "s" : ""}`
                                : "No steps"}
                            </span>
                          </div>

                          {(job.agent || needs.length > 0) && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {job.agent && (
                                <span className="text-[10px] text-violet-600 bg-violet-50 border border-violet-100 rounded px-1.5 py-0.5">
                                  agent: {job.agent}
                                </span>
                              )}
                              {needs.length > 0 && (
                                <span className="text-[10px] text-default-500 bg-default-50 border border-default-100 rounded px-1.5 py-0.5 truncate max-w-full">
                                  needs: {needs.join(", ")}
                                </span>
                              )}
                            </div>
                          )}

                          {job.prompt && (
                            <p className="text-[10px] text-default-400 mt-1 truncate">
                              {job.prompt}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Direction */}
          <div className="flex flex-col gap-1.5">
            <Label id={directionLabelId} className="text-xs font-medium">
              Direction{" "}
              <span className="text-default-400 font-normal">(optional)</span>
            </Label>
            <TextArea
              aria-labelledby={directionLabelId}
              placeholder="Describe how the steps should be structured...&#10;e.g. Break the job into research, drafting, and fact-checking steps, keeping each focused and independently verifiable"
              value={userDescription}
              onChange={(e) => setUserDescription(e.target.value)}
              className="min-h-[80px]"
              disabled={isGenerating}
            />
          </div>

          {/* Strategy */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">
              When a job already has steps
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStrategy("append")}
                disabled={isGenerating}
                className={`text-left px-3 py-2 rounded-lg border text-xs transition-all disabled:opacity-60 ${
                  strategy === "append"
                    ? "bg-teal-50 border-teal-300 text-teal-700"
                    : "bg-background border-default-200 text-default-600 hover:bg-default-50"
                }`}
              >
                <span className="block font-medium">Append</span>
                <span className="block text-[10px] text-default-400 mt-0.5">
                  Keep existing steps, add generated ones
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStrategy("override")}
                disabled={isGenerating}
                className={`text-left px-3 py-2 rounded-lg border text-xs transition-all disabled:opacity-60 ${
                  strategy === "override"
                    ? "bg-amber-50 border-amber-300 text-amber-700"
                    : "bg-background border-default-200 text-default-600 hover:bg-default-50"
                }`}
              >
                <span className="block font-medium">Override</span>
                <span className="block text-[10px] text-default-400 mt-0.5">
                  Replace existing steps entirely
                </span>
              </button>
            </div>
            {strategy === "override" && hasExistingStepsAmongSelected && (
              <p className="text-[10px] text-amber-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Existing steps on selected jobs will be replaced.
              </p>
            )}
          </div>

          {/* Info */}
          <div className="bg-default-50 rounded-xl p-3 text-xs text-default-500">
            <p className="font-medium text-default-600 mb-1">How it works:</p>
            <p>
              The AI analyzes the workflow context (name, description, existing
              jobs, agents and variables) and generates contextual steps for the
              selected jobs, assigning agents where appropriate.
            </p>
          </div>

          {/* Generating */}
          {isGenerating && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-teal-500 animate-spin shrink-0" />
              <div>
                <p className="text-xs font-medium text-teal-700">
                  AI is generating steps...
                </p>
                <p className="text-[10px] text-teal-600 mt-0.5">
                  Analyzing {selectedCount} job
                  {selectedCount !== 1 ? "s" : ""} and creating step definitions
                </p>
              </div>
            </div>
          )}

          {/* Result */}
          {result && !isGenerating && (
            <div className="bg-success-50 border border-success-200 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-success-700 mb-1">
                    Steps generated successfully
                  </p>
                  <pre className="text-xs text-success-600 whitespace-pre-wrap font-sans">
                    {result}
                  </pre>
                </div>
              </div>

              {stepsPreview && (
                <div className="mt-2 bg-success-100/50 rounded-lg p-2.5">
                  <p className="text-[10px] font-medium text-success-600 mb-1 uppercase tracking-wider">
                    Step Preview
                  </p>
                  <pre className="text-[11px] text-success-700 whitespace-pre-wrap font-mono leading-relaxed">
                    {stepsPreview}
                  </pre>
                </div>
              )}

              {missingVariables.length > 0 && (
                <div className="mt-2 bg-primary-50 border border-primary-200 rounded-lg p-2.5">
                  <p className="text-[10px] font-medium text-primary-600 mb-1.5 uppercase tracking-wider">
                    Variables to add ({missingVariables.length})
                  </p>
                  <div className="space-y-1">
                    {missingVariables.map((v) => (
                      <div
                        key={v.name}
                        className="flex items-center gap-2 text-[11px]"
                      >
                        <code className="bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded font-mono text-[10px]">
                          {`{{${v.name}}}`}
                        </code>
                        <span className="text-primary-600 truncate">
                          {v.description || v.name}
                        </span>
                        <span className="text-primary-400 ml-auto text-[10px] capitalize">
                          {v.type || "text"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-danger-50 border border-danger-200 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-danger-700 mb-0.5">
                  Generation Failed
                </p>
                <p className="text-xs text-danger-600">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-default-100">
          {generatedJobs ? (
            <>
              <Button
                onPress={resetGenerated}
                variant="ghost"
                size="sm"
                className="text-default-500"
              >
                <X className="w-4 h-4" />
                Discard
              </Button>
              <Button
                onPress={handleApply}
                variant="primary"
                size="sm"
                className="bg-teal-600 text-white"
              >
                <CheckCircle2 className="w-4 h-4" />
                Apply Steps
              </Button>
            </>
          ) : (
            <>
              <Button
                onPress={onClose}
                variant="ghost"
                size="sm"
                className="text-default-500"
              >
                Cancel
              </Button>
              <Button
                onPress={handleGenerate}
                variant="primary"
                size="sm"
                isDisabled={!canGenerate}
                className="bg-teal-600 text-white"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    AI Generate Steps
                    {selectedCount > 0 ? ` (${selectedCount})` : ""}
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
