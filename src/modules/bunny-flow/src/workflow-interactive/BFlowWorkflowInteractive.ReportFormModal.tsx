/**
 * BFlowWorkflowInteractive.ReportFormModal — Modal form for creating/editing a report export configuration.
 *
 * Source selection uses a cascading Jobs → Steps → Output selector,
 * enabling users to pick a concrete job step output as the report source.
 */

"use client";

import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Button, Input, Label, Select, ListBox } from "@heroui/react";
import type { BFlowInteractiveReport, BFlowInteractiveJob } from "./BFlowWorkflowInteractive.Types";

interface BFlowReportFormModalProps {
  open: boolean;
  report: BFlowInteractiveReport;
  jobs: BFlowInteractiveJob[];
  onClose: () => void;
  onSave: (report: BFlowInteractiveReport) => void;
}

/**
 * Parse a report source string into its components.
 * Expected format: "{jobName}.{stepName}.outputs.{outputName}"
 */
function parseReportSource(source: string): {
  jobName: string;
  stepName: string;
  outputName: string;
} | null {
  const match = source.match(/^([^.]+)\.([^.]+)\.outputs\.([^.]+)$/);
  if (!match) return null;
  return { jobName: match[1], stepName: match[2], outputName: match[3] };
}

/** Compute available output options for a given step. */
function getStepOutputOptions(
  step: BFlowInteractiveJob["steps"][number],
): { label: string; value: string }[] {
  const opts: { label: string; value: string }[] = [];
  if (step.output && step.output.length > 0) {
    step.output.forEach((o) => {
      opts.push({ label: `${o.name} (${o.type})`, value: o.name });
    });
  }
  // Always offer __raw__
  if (!opts.find((o) => o.value === "__raw__")) {
    opts.push({ label: "__raw__ (full output)", value: "__raw__" });
  }
  return opts;
}

export function BFlowReportFormModal({
  open,
  report,
  jobs,
  onClose,
  onSave,
}: BFlowReportFormModalProps) {
  const [form, setForm] = useState<BFlowInteractiveReport>({ ...report });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Derived cascade state from the current source
  const parsed = useMemo(() => parseReportSource(form.source), [form.source]);

  const selectedJobIdx = useMemo(() => {
    if (!parsed) return -1;
    return jobs.findIndex((j) => j.name === parsed.jobName);
  }, [parsed, jobs]);

  const selectedStepIdx = useMemo(() => {
    if (!parsed || selectedJobIdx < 0) return -1;
    return jobs[selectedJobIdx].steps.findIndex(
      (s) => s.name === parsed.stepName,
    );
  }, [parsed, selectedJobIdx, jobs]);

  // Sync form state when report prop changes (e.g. opening modal for a different report to edit)
  useEffect(() => {
    setForm({ ...report });
    setErrors({});
  }, [report]);

  // Generate unique IDs for proper ARIA labeling
  const reportNameLabelId = useId();
  const reportLabelLabelId = useId();
  const reportJobLabelId = useId();
  const reportStepLabelId = useId();
  const reportOutputLabelId = useId();

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Report name is required";
    if (!form.source.trim()) errs.source = "Source is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form]);

  const handleSave = useCallback(() => {
    if (validate()) {
      onSave(form);
      onClose();
    }
  }, [form, validate, onSave, onClose]);

  /** Build source string and update form. */
  const updateSource = useCallback(
    (jobName: string, stepName: string, outputName: string) => {
      const source = `${jobName}.${stepName}.outputs.${outputName}`;
      setForm((prev) => ({ ...prev, source }));
    },
    [],
  );

  /** When a job is selected — auto-select first step + first output. */
  const handleJobSelect = useCallback(
    (jobIndex: number) => {
      const j = jobs[Number(jobIndex)];
      if (!j?.steps[0]) {
        setForm((prev) => ({ ...prev, source: "" }));
        return;
      }
      const s = j.steps[0];
      const outName =
        s.output && s.output.length > 0 ? s.output[0].name : "__raw__";
      updateSource(j.name, s.name, outName);
    },
    [jobs, updateSource],
  );

  /** When a step is selected — auto-select first output. */
  const handleStepSelect = useCallback(
    (stepIndex: number) => {
      const j = jobs[selectedJobIdx];
      const s = j?.steps[Number(stepIndex)];
      if (!j || !s) return;
      const outName =
        s.output && s.output.length > 0 ? s.output[0].name : "__raw__";
      updateSource(j.name, s.name, outName);
    },
    [jobs, selectedJobIdx, updateSource],
  );

  /** When an output is selected. */
  const handleOutputSelect = useCallback(
    (outputName: string) => {
      if (!parsed) return;
      updateSource(parsed.jobName, parsed.stepName, outputName);
    },
    [parsed, updateSource],
  );

  if (!open) return null;

  // Derived output options for the currently selected step
  const selectedJob = selectedJobIdx >= 0 ? jobs[selectedJobIdx] : null;
  const selectedStep =
    selectedJob && selectedStepIdx >= 0
      ? selectedJob.steps[selectedStepIdx]
      : null;
  const outputOptions = selectedStep ? getStepOutputOptions(selectedStep) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-2xl shadow-xl max-w-md w-full mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-default-100">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              {report.name ? "Edit Report" : "Add Report"}
            </h3>
            <p className="text-xs text-default-400 mt-0.5">
              Configure the report export
            </p>
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
        <div className="px-5 py-4 space-y-4">
          {/* Report Name */}
          <div className="flex flex-col gap-1.5">
            <Label id={reportNameLabelId} className="text-xs font-medium">
              Report Name *
            </Label>
            <Input
              aria-labelledby={reportNameLabelId}
              placeholder="e.g. final-report"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            {errors.name && (
              <p className="text-xs text-danger">{errors.name}</p>
            )}
          </div>

          {/* Label */}
          <div className="flex flex-col gap-1.5">
            <Label id={reportLabelLabelId} className="text-xs font-medium">
              Label
            </Label>
            <Input
              aria-labelledby={reportLabelLabelId}
              placeholder="e.g. Pipeline Report"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
          </div>

          {/* ── Cascading Source Selector ────────────────────────── */}
          <div className="flex flex-col gap-1.5">
            <Label id={reportJobLabelId} className="text-xs font-medium">
              Source * — Job
            </Label>

            {/* Job selector */}
            <Select
              aria-labelledby={reportJobLabelId}
              value={selectedJobIdx >= 0 ? String(selectedJobIdx) : ""}
              onChange={(val) => handleJobSelect(Number(val))}
              placeholder="Select job"
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {jobs.length === 0 && (
                    <ListBox.Item key="no-jobs" id="" textValue="No jobs">
                      No jobs available
                    </ListBox.Item>
                  )}
                  {jobs.map((j, jIdx) => (
                    <ListBox.Item
                      key={jIdx}
                      id={String(jIdx)}
                      textValue={j.name || `Job ${jIdx + 1}`}
                    >
                      {j.name || `Job ${jIdx + 1}`}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            {/* Step selector (shown when a job is selected) */}
            {selectedJob && (
              <div className="flex flex-col gap-1.5 mt-2">
                <Label
                  id={reportStepLabelId}
                  className="text-xs font-medium text-default-500"
                >
                  Step
                </Label>
                <Select
                  aria-labelledby={reportStepLabelId}
                  value={selectedStepIdx >= 0 ? String(selectedStepIdx) : ""}
                  onChange={(val) => handleStepSelect(Number(val))}
                  placeholder="Select step"
                >
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {selectedJob.steps.map((s, sIdx) => (
                        <ListBox.Item
                          key={sIdx}
                          id={String(sIdx)}
                          textValue={s.name || `Step ${sIdx + 1}`}
                        >
                          {s.name || `Step ${sIdx + 1}`}
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>
            )}

            {/* Output selector (shown when a step is selected) */}
            {selectedStep && outputOptions.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-2">
                <Label
                  id={reportOutputLabelId}
                  className="text-xs font-medium text-default-500"
                >
                  Output
                </Label>
                <Select
                  aria-labelledby={reportOutputLabelId}
                  value={parsed?.outputName ?? ""}
                  onChange={(val) => handleOutputSelect(val as string)}
                  placeholder="Select output"
                >
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {outputOptions.map((o) => (
                        <ListBox.Item
                          key={o.value}
                          id={o.value}
                          textValue={o.label}
                        >
                          {o.label}
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>
            )}

            {/* Source preview */}
            {form.source && (
              <p className="text-[10px] text-default-400 font-mono truncate mt-1">
                Source: {form.source}
              </p>
            )}

            {errors.source && (
              <p className="text-xs text-danger">{errors.source}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-default-100">
          <Button
            onPress={onClose}
            variant="ghost"
            size="sm"
            className="text-default-500"
          >
            Cancel
          </Button>
          <Button onPress={handleSave} variant="primary" size="sm">
            Save Report
          </Button>
        </div>
      </div>
    </div>
  );
}
