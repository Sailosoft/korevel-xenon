/**
 * BFlowWorkflowInteractive.JobFormModal — Modal form for creating/editing a workflow job.
 */

"use client";

import React, { useCallback, useEffect, useId, useState } from "react";
import { Button, Input, Label, TextArea, Select, ListBox } from "@heroui/react";
import type { BFlowInteractiveJob } from "./BFlowWorkflowInteractive.Types";

interface BFlowJobFormModalProps {
  open: boolean;
  job: BFlowInteractiveJob;
  agents: string[];
  onClose: () => void;
  onSave: (job: BFlowInteractiveJob) => void;
}

export function BFlowJobFormModal({
  open,
  job,
  agents,
  onClose,
  onSave,
}: BFlowJobFormModalProps) {
  const [form, setForm] = useState<BFlowInteractiveJob>({ ...job });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync form state when job prop changes (e.g. opening modal for a different item to edit)
  useEffect(() => {
    setForm({ ...job });
    setErrors({});
  }, [job]);

  // Generate unique IDs for proper ARIA labeling if native labeling props aren't utilized
  const nameLabelId = useId();
  const agentLabelId = useId();
  const needsLabelId = useId();
  const promptLabelId = useId();

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Job name is required";
    if (!form.prompt.trim()) errs.prompt = "Job prompt is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form]);

  const handleSave = useCallback(() => {
    if (validate()) {
      onSave(form);
      onClose();
    }
  }, [form, validate, onSave, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-default-100">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              {job.name ? "Edit Job" : "Add Job"}
            </h3>
            <p className="text-xs text-default-400 mt-0.5">
              Configure the job details below
            </p>
          </div>
          <Button
            onPress={onClose}
            variant="ghost"
            size="sm"
            className="text-default-400 h-8 w-8 min-w-0 p-0"
            aria-Label="Close modal"
          >
            ✕
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Name & Agent */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label id={nameLabelId} className="text-xs font-medium">
                Job Name *
              </Label>
              <Input
                aria-labelledby={nameLabelId}
                placeholder="e.g. extract-content"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              {errors.name && (
                <p className="text-xs text-danger">{errors.name}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label id={agentLabelId} className="text-xs font-medium">
                Agent (optional)
              </Label>
              <Select
                aria-labelledby={agentLabelId}
                value={form.agent || null}
                onChange={(val) => setForm({ ...form, agent: val as string })}
                placeholder="Select agent"
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox aria-labelledby={agentLabelId}>
                    <ListBox.Item key="" id="" textValue="No agent">
                      No agent
                    </ListBox.Item>
                    {agents.map((agent) => (
                      <ListBox.Item key={agent} id={agent} textValue={agent}>
                        {agent}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>
          </div>

          {/* Needs */}
          <div className="flex flex-col gap-1.5">
            <Label id={needsLabelId} className="text-xs font-medium">
              Depends on (needs)
            </Label>
            <Input
              aria-labelledby={needsLabelId}
              placeholder="e.g. job-001, job-002"
              value={form.needs}
              onChange={(e) => setForm({ ...form, needs: e.target.value })}
            />
            <p className="text-[10px] text-default-400">
              Comma-separated job names this job depends on
            </p>
          </div>

          {/* Prompt */}
          <div className="flex flex-col gap-1.5">
            <Label id={promptLabelId} className="text-xs font-medium">
              Job Prompt *
            </Label>
            <TextArea
              aria-labelledby={promptLabelId}
              placeholder="Enter the job prompt"
              value={form.prompt}
              onChange={(e) => setForm({ ...form, prompt: e.target.value })}
              className="min-h-[100px]"
            />
            {errors.prompt && (
              <p className="text-xs text-danger">{errors.prompt}</p>
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
            Save Job
          </Button>
        </div>
      </div>
    </div>
  );
}
