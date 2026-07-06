/**
 * BFlowWorkflowInteractive.StepFormModal — Modal form for creating/editing a workflow step.
 */

"use client";

import React, { useCallback, useEffect, useId, useState } from "react";
import { Button, Input, Label, TextArea, Select, ListBox } from "@heroui/react";
import { Plus, Trash2 } from "lucide-react";
import type { BFlowInteractiveStep, BFlowInteractiveStepInput, BFlowInteractiveVariable, BFlowInteractiveJob } from "./BFlowWorkflowInteractive.Types";
import {
  OUTPUT_TYPE_OPTIONS,
  CONDITION_OPTIONS,
} from "./BFlowWorkflowInteractive.Types";

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Infer the input mode from a source string.
 * - Starts with "vars." → "vars"
 * - Matches "{job}.{step}.outputs.{field}" → "steps"
 * - Otherwise → undefined (raw/legacy value)
 */
function inferInputMode(source: string): "vars" | "steps" | undefined {
  if (source.startsWith("vars.")) return "vars";
  if (/^[^.]+\.([^.]+)\.outputs\.[^.]+$/.test(source)) return "steps";
  return undefined;
}

/** Parse a steps-mode source into its components. */
function parseStepsSource(source: string): {
  jobName: string;
  stepName: string;
  outputName: string;
} | null {
  const match = source.match(/^([^.]+)\.([^.]+)\.outputs\.([^.]+)$/);
  if (!match) return null;
  return { jobName: match[1], stepName: match[2], outputName: match[3] };
}

/** Extract variable name from a vars-mode source. */
function parseVarName(source: string): string | null {
  if (!source.startsWith("vars.")) return null;
  return source.slice(5);
}

// ─── Props ────────────────────────────────────────────────────────────

interface BFlowStepFormModalProps {
  open: boolean;
  step: BFlowInteractiveStep;
  onClose: () => void;
  onSave: (step: BFlowInteractiveStep) => void;
  availableAgents: string[];
  /** Workflow-level variables (for vars mode) */
  variables: BFlowInteractiveVariable[];
  /** All workflow jobs (for steps mode cascade) */
  jobs: BFlowInteractiveJob[];
}

// ─── Component ────────────────────────────────────────────────────────

export function BFlowStepFormModal({
  open,
  step,
  onClose,
  onSave,
  availableAgents,
  variables,
  jobs,
}: BFlowStepFormModalProps) {
  const [form, setForm] = useState<BFlowInteractiveStep>({ ...step });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync form state when step prop changes
  useEffect(() => {
    setForm({ ...step });
    setErrors({});
  }, [step]);

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Step name is required";
    if (!form.prompts.trim()) errs.prompts = "At least one prompt is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form]);

  const handleSave = useCallback(() => {
    if (validate()) {
      onSave(form);
      onClose();
    }
  }, [form, validate, onSave, onClose]);

  const addSkipCondition = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      skipIf: [...prev.skipIf, { inputs: "", condition: "==", value: "" }],
    }));
  }, []);

  const updateSkipCondition = useCallback(
    (index: number, field: string, value: string) => {
      setForm((prev) => {
        const updated = [...prev.skipIf];
        updated[index] = { ...updated[index], [field]: value };
        return { ...prev, skipIf: updated };
      });
    },
    [],
  );

  const removeSkipCondition = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      skipIf: prev.skipIf.filter((_, i) => i !== index),
    }));
  }, []);

  // ── Input handlers ────────────────────────────────────────────

  const addInput = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      inputs: [...prev.inputs, { name: "", source: "" }],
    }));
  }, []);

  const updateInput = useCallback(
    (index: number, field: string, value: string) => {
      setForm((prev) => {
        const updated = [...prev.inputs];
        updated[index] = { ...updated[index], [field]: value };
        return { ...prev, inputs: updated };
      });
    },
    [],
  );

  /**
   * Set the source for a given input, auto-filling name:
   * - vars mode → name = variable name
   * - steps mode with __raw__ → name = step name
   * - steps mode with named output → name = output name
   */
  const setInputSource = useCallback(
    (index: number, source: string, autoName?: string) => {
      setForm((prev) => {
        const updated = [...prev.inputs];
        const name = autoName ?? updated[index].name;
        updated[index] = { ...updated[index], source, name };
        return { ...prev, inputs: updated };
      });
    },
    [],
  );

  /** When user selects a variable in vars mode — name = var name. */
  const handleVarSelect = useCallback(
    (inputIndex: number, varName: string) => {
      setInputSource(inputIndex, `vars.${varName}`, varName);
    },
    [setInputSource],
  );

  /** When user selects a job — reset cascade to first step+output. */
  const handleJobSelect = useCallback(
    (inputIndex: number, jobIndex: number) => {
      const j = jobs[Number(jobIndex)];
      if (!j?.steps[0]) return;
      const s = j.steps[0];
      const outName =
        s.output && s.output.length > 0 ? s.output[0].name : "__raw__";
      const name = outName === "__raw__" ? s.name : outName;
      setInputSource(
        inputIndex,
        `${j.name}.${s.name}.outputs.${outName}`,
        name,
      );
    },
    [jobs, setInputSource],
  );

  /** When user selects a step — auto-pick first output or __raw__. */
  const handleStepSelect = useCallback(
    (inputIndex: number, stepIndex: number, selectedJobIndex: number) => {
      const j = jobs[Number(selectedJobIndex)];
      const s = j?.steps[Number(stepIndex)];
      if (!j || !s) return;
      const outName =
        s.output && s.output.length > 0 ? s.output[0].name : "__raw__";
      const name = outName === "__raw__" ? s.name : outName;
      setInputSource(
        inputIndex,
        `${j.name}.${s.name}.outputs.${outName}`,
        name,
      );
    },
    [jobs, setInputSource],
  );

  /** When user selects an output. */
  const handleOutputSelect = useCallback(
    (
      inputIndex: number,
      outputName: string,
      selectedJobIndex: number,
      selectedStepIndex: number,
    ) => {
      const j = jobs[Number(selectedJobIndex)];
      const s = j?.steps[Number(selectedStepIndex)];
      if (!j || !s) return;
      const name = outputName === "__raw__" ? s.name : outputName;
      setInputSource(
        inputIndex,
        `${j.name}.${s.name}.outputs.${outputName}`,
        name,
      );
    },
    [jobs, setInputSource],
  );

  const removeInput = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      inputs: prev.inputs.filter((_, i) => i !== index),
    }));
  }, []);

  const addOutput = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      output: [...prev.output, { name: "", type: "markdown" }],
    }));
  }, []);

  const updateOutput = useCallback(
    (index: number, field: string, value: string) => {
      setForm((prev) => {
        const updated = [...prev.output];
        updated[index] = { ...updated[index], [field]: value };
        return { ...prev, output: updated };
      });
    },
    [],
  );

  const removeOutput = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      output: prev.output.filter((_, i) => i !== index),
    }));
  }, []);

  // Generate unique IDs for proper ARIA labeling
  const stepNameLabelId = useId();
  const stepAgentLabelId = useId();
  const outputTypeLabelId = useId();
  const promptsLabelId = useId();

  if (!open) return null;

  /** Renders a single input card (no name field, just mode + selectors). */
  const renderInputCard = (inp: BFlowInteractiveStepInput, idx: number) => {
    const currentMode = inp.inputMode || inferInputMode(inp.source);
    const isVars = currentMode === "vars";
    const isSteps = currentMode === "steps";

    return (
      <div
        key={idx}
        className="flex flex-col gap-2.5 bg-default-50 rounded-lg p-3"
      >
        {/* Name + Delete row */}
        <div className="flex items-center gap-2">
          <Input
            placeholder="name"
            value={inp.name}
            onChange={(e) => updateInput(idx, "name", e.target.value)}
            className="flex-1"
          />
          <Button
            onPress={() => removeInput(idx)}
            variant="ghost"
            size="sm"
            className="text-danger h-7 min-w-0 w-7 p-0 shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Mode toggle row */}
        <div className="flex items-center gap-1">
          <Button
            onPress={() => setInputSource(idx, "")}
            variant={!isVars && !isSteps ? "outline" : "ghost"}
            size="sm"
            className={`h-7 min-w-0 px-2.5 text-xs ${
              !isVars && !isSteps
                ? "bg-default-200 text-default-600"
                : "text-default-400"
            }`}
          >
            None
          </Button>
          <Button
            onPress={() => {
              // Switch to vars mode
              if (!isVars) {
                if (variables.length > 0) {
                  handleVarSelect(idx, variables[0].name);
                } else {
                  setInputSource(idx, "");
                }
              }
            }}
            variant={isVars ? "outline" : "ghost"}
            size="sm"
            className={`h-7 min-w-0 px-2.5 text-xs ${
              isVars
                ? "bg-primary text-primary-foreground"
                : "text-default-400"
            }`}
          >
            vars
          </Button>
          <Button
            onPress={() => {
              // Switch to inputs (steps) mode
              if (!isSteps) {
                const firstJob = jobs.find((j) => j.steps.length > 0);
                if (firstJob) {
                  const firstStep = firstJob.steps[0];
                  const outName =
                    firstStep.output && firstStep.output.length > 0
                      ? firstStep.output[0].name
                      : "__raw__";
                  const name =
                    outName === "__raw__"
                      ? firstStep.name
                      : outName;
                  setInputSource(
                    idx,
                    `${firstJob.name}.${firstStep.name}.outputs.${outName}`,
                    name,
                  );
                }
              }
            }}
            variant={isSteps ? "outline" : "ghost"}
            size="sm"
            className={`h-7 min-w-0 px-2.5 text-xs ${
              isSteps
                ? "bg-primary text-primary-foreground"
                : "text-default-400"
            }`}
          >
            inputs
          </Button>
        </div>

        {/* Vars picker */}
        {isVars && (
          <Select
            value={parseVarName(inp.source) ?? ""}
            onChange={(val) => handleVarSelect(idx, val as string)}
            placeholder="Select variable"
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {variables.length === 0 && (
                  <ListBox.Item
                    key="no-vars"
                    id=""
                    textValue="No variables"
                  >
                    No variables available
                  </ListBox.Item>
                )}
                {variables.map((v) => (
                  <ListBox.Item
                    key={v.name}
                    id={v.name}
                    textValue={v.name}
                  >
                    {v.name}
                    <span className="text-xs text-default-400 ml-2">
                      ({v.type})
                    </span>
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        )}

        {/* Steps / inputs cascade */}
        {isSteps && (
          <div className="flex flex-col gap-2">
            {/* Job selector */}
            <Select
              value={
                (() => {
                  const p = parseStepsSource(inp.source);
                  if (!p) return "";
                  const jIdx = jobs.findIndex((j) => j.name === p.jobName);
                  return jIdx >= 0 ? String(jIdx) : "";
                })()
              }
              onChange={(val) => handleJobSelect(idx, Number(val))}
              placeholder="Select job"
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
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

            {/* Step selector */}
            {(() => {
              const p = parseStepsSource(inp.source);
              const job = p
                ? jobs.find((j) => j.name === p.jobName)
                : null;
              if (!job) return null;
              return (
                <Select
                  value={
                    p
                      ? String(
                          job.steps.findIndex(
                            (s) => s.name === p.stepName,
                          ),
                        )
                      : ""
                  }
                  onChange={(val) => {
                    const jIdx = jobs.findIndex((j) => j.name === job.name);
                    handleStepSelect(idx, Number(val), jIdx);
                  }}
                  placeholder="Select step"
                >
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {job.steps.map((s, sIdx) => (
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
              );
            })()}

            {/* Output selector (optional — only if step has named outputs) */}
            {(() => {
              const p = parseStepsSource(inp.source);
              if (!p) return null;
              const job = jobs.find((j) => j.name === p.jobName);
              if (!job) return null;
              const step = job.steps.find((s) => s.name === p.stepName);
              if (!step) return null;

              const outputOpts: { label: string; value: string }[] = [];
              if (step.output && step.output.length > 0) {
                step.output.forEach((o) => {
                  outputOpts.push({
                    label: `${o.name} (${o.type})`,
                    value: o.name,
                  });
                });
              }
              // Always offer __raw__
              if (!outputOpts.find((o) => o.value === "__raw__")) {
                outputOpts.push({
                  label: "__raw__ (full output)",
                  value: "__raw__",
                });
              }

              return (
                <Select
                  value={p.outputName || ""}
                  onChange={(val) => {
                    const jIdx = jobs.findIndex(
                      (j) => j.name === p.jobName,
                    );
                    const sIdx = job.steps.findIndex(
                      (s) => s.name === p.stepName,
                    );
                    handleOutputSelect(
                      idx,
                      val as string,
                      jIdx,
                      sIdx,
                    );
                  }}
                  placeholder="Select output"
                >
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {outputOpts.map((o) => (
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
              );
            })()}
          </div>
        )}

        {/* Source preview */}
        {inp.source && (
          <p className="text-[10px] text-default-400 font-mono truncate">
            {inp.source}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-default-100">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              {step.name ? "Edit Step" : "Add Step"}
            </h3>
            <p className="text-xs text-default-400 mt-0.5">
              Configure the step details below
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
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Name & Agent */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label id={stepNameLabelId} className="text-xs font-medium">
                Step Name *
              </Label>
              <Input
                aria-labelledby={stepNameLabelId}
                placeholder="e.g. extract-content"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              {errors.name && (
                <p className="text-xs text-danger">{errors.name}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label id={stepAgentLabelId} className="text-xs font-medium">
                Agent (optional)
              </Label>
              <Select
                aria-labelledby={stepAgentLabelId}
                value={form.agent || null}
                onChange={(val) => setForm({ ...form, agent: val as string })}
                placeholder="Select agent"
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox aria-labelledby={stepAgentLabelId}>
                    <ListBox.Item key="" id="" textValue="No agent">
                      No agent
                    </ListBox.Item>
                    {availableAgents.map((agent) => (
                      <ListBox.Item key={agent} id={agent} textValue={agent}>
                        {agent}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>
          </div>

          {/* Output Type */}
          <div className="flex flex-col gap-1.5">
            <Label id={outputTypeLabelId} className="text-xs font-medium">
              Output Type
            </Label>
            <Select
              aria-labelledby={outputTypeLabelId}
              value={form.outputType ?? "markdown"}
              onChange={(val) =>
                setForm({ ...form, outputType: val as string })
              }
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox aria-labelledby={outputTypeLabelId}>
                  {OUTPUT_TYPE_OPTIONS.map((opt) => (
                    <ListBox.Item
                      key={opt.value}
                      id={opt.value}
                      textValue={opt.label}
                    >
                      {opt.label}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          {/* Prompts */}
          <div className="flex flex-col gap-1.5">
            <Label id={promptsLabelId} className="text-xs font-medium">
              Prompts *
            </Label>
            <TextArea
              aria-labelledby={promptsLabelId}
              placeholder="Enter step prompts (one per line)"
              value={form.prompts}
              onChange={(e) => setForm({ ...form, prompts: e.target.value })}
              className="min-h-[80px]"
            />
            {errors.prompts && (
              <p className="text-xs text-danger">{errors.prompts}</p>
            )}
          </div>

          {/* Skip Conditions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Skip Conditions</Label>
              <Button
                onPress={addSkipCondition}
                variant="ghost"
                size="sm"
                className="text-primary h-6 min-w-0 px-1.5 text-xs"
              >
                <Plus className="w-3 h-3" />
                Add Condition
              </Button>
            </div>
            {form.skipIf.length === 0 && (
              <p className="text-xs text-default-400 italic">
                No skip conditions — step always runs
              </p>
            )}
            {form.skipIf.map((sk, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 bg-default-50 rounded-lg p-2"
              >
                <Input
                  placeholder="inputs.field"
                  value={sk.inputs}
                  onChange={(e) =>
                    updateSkipCondition(idx, "inputs", e.target.value)
                  }
                  className="flex-1"
                />
                <Select
                  value={sk.condition}
                  onChange={(val) =>
                    updateSkipCondition(idx, "condition", val as string)
                  }
                  className="w-20"
                >
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {CONDITION_OPTIONS.map((opt) => (
                        <ListBox.Item
                          key={opt.value}
                          id={opt.value}
                          textValue={opt.label}
                        >
                          {opt.label}
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
                <Input
                  placeholder="value"
                  value={sk.value}
                  onChange={(e) =>
                    updateSkipCondition(idx, "value", e.target.value)
                  }
                  className="flex-1"
                />
                <Button
                  onPress={() => removeSkipCondition(idx)}
                  variant="ghost"
                  size="sm"
                  className="text-danger h-7 min-w-0 w-7 p-0"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>

          {/* Inputs — redesigned cards */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Inputs</Label>
              <Button
                onPress={addInput}
                variant="ghost"
                size="sm"
                className="text-primary h-6 min-w-0 px-1.5 text-xs"
              >
                <Plus className="w-3 h-3" />
                Add Input
              </Button>
            </div>
            {form.inputs.length === 0 && (
              <p className="text-xs text-default-400 italic">
                No inputs defined
              </p>
            )}
            {form.inputs.map((inp, idx) => renderInputCard(inp, idx))}
          </div>

          {/* Structured Outputs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Structured Outputs</Label>
              <Button
                onPress={addOutput}
                variant="ghost"
                size="sm"
                className="text-primary h-6 min-w-0 px-1.5 text-xs"
              >
                <Plus className="w-3 h-3" />
                Add Output
              </Button>
            </div>
            {form.output.length === 0 && (
              <p className="text-xs text-default-400 italic">
                No structured outputs — uses outputType instead
              </p>
            )}
            {form.output.map((out, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 bg-default-50 rounded-lg p-2"
              >
                <Input
                  placeholder="field name"
                  value={out.name}
                  onChange={(e) => updateOutput(idx, "name", e.target.value)}
                  className="flex-1"
                />
                <Select
                  value={out.type}
                  onChange={(val) => updateOutput(idx, "type", val as string)}
                  className="w-36"
                >
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {OUTPUT_TYPE_OPTIONS.map((opt) => (
                        <ListBox.Item
                          key={opt.value}
                          id={opt.value}
                          textValue={opt.label}
                        >
                          {opt.label}
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
                <Button
                  onPress={() => removeOutput(idx)}
                  variant="ghost"
                  size="sm"
                  className="text-danger h-7 min-w-0 w-7 p-0"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
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
            Save Step
          </Button>
        </div>
      </div>
    </div>
  );
}
