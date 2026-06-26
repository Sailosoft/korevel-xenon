/**
 * BFlowWorkflowInteractive.StepFormModal — Modal form for creating/editing a workflow step.
 */

"use client";

import React, { useCallback, useEffect, useId, useState } from "react";
import { Button, Input, Label, TextArea, Select, ListBox } from "@heroui/react";
import { Plus, Trash2 } from "lucide-react";
import type { BFlowInteractiveStep } from "./BFlowWorkflowInteractive.Types";
import {
  OUTPUT_TYPE_OPTIONS,
  CONDITION_OPTIONS,
} from "./BFlowWorkflowInteractive.Types";

interface BFlowStepFormModalProps {
  open: boolean;
  step: BFlowInteractiveStep;
  onClose: () => void;
  onSave: (step: BFlowInteractiveStep) => void;
  availableAgents: string[];
}

export function BFlowStepFormModal({
  open,
  step,
  onClose,
  onSave,
  availableAgents,
}: BFlowStepFormModalProps) {
  const [form, setForm] = useState<BFlowInteractiveStep>({ ...step });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync form state when step prop changes (e.g. opening modal for a different step to edit)
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

          {/* Inputs */}
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
            {form.inputs.map((inp, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 bg-default-50 rounded-lg p-2"
              >
                <Input
                  placeholder="name"
                  value={inp.name}
                  onChange={(e) => updateInput(idx, "name", e.target.value)}
                  className="flex-[2]"
                />
                <Input
                  placeholder="{job}.{step}.outputs.{name}"
                  value={inp.source}
                  onChange={(e) => updateInput(idx, "source", e.target.value)}
                  className="flex-[3]"
                />
                <Button
                  onPress={() => removeInput(idx)}
                  variant="ghost"
                  size="sm"
                  className="text-danger h-7 min-w-0 w-7 p-0"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
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
