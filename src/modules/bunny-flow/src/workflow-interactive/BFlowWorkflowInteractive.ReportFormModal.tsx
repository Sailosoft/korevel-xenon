/**
 * BFlowWorkflowInteractive.ReportFormModal — Modal form for creating/editing a report export configuration.
 */

"use client";

import React, { useCallback, useEffect, useId, useState } from "react";
import { Button, Input, Label, Select, ListBox } from "@heroui/react";
import type { BFlowInteractiveReport } from "./BFlowWorkflowInteractive.Types";

interface BFlowReportFormModalProps {
  open: boolean;
  report: BFlowInteractiveReport;
  onClose: () => void;
  onSave: (report: BFlowInteractiveReport) => void;
}

export function BFlowReportFormModal({
  open,
  report,
  onClose,
  onSave,
}: BFlowReportFormModalProps) {
  const [form, setForm] = useState<BFlowInteractiveReport>({ ...report });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync form state when report prop changes (e.g. opening modal for a different report to edit)
  useEffect(() => {
    setForm({ ...report });
    setErrors({});
  }, [report]);

  // Generate unique IDs for proper ARIA labeling
  const reportNameLabelId = useId();
  const reportLabelLabelId = useId();
  const reportSourceLabelId = useId();

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

  if (!open) return null;

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
          <div className="flex flex-col gap-1.5">
            <Label id={reportSourceLabelId} className="text-xs font-medium">
              Source *
            </Label>
            <Select
              aria-labelledby={reportSourceLabelId}
              value={form.source}
              onChange={(val) => setForm({ ...form, source: val as string })}
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox aria-labelledby={reportSourceLabelId}>
                  <ListBox.Item
                    key="job.step"
                    id="job.step"
                    textValue="job.step"
                  >
                    job.step
                  </ListBox.Item>
                  <ListBox.Item
                    key="job.step.outputs.__raw__"
                    id="job.step.outputs.__raw__"
                    textValue="job.step.outputs.__raw__"
                  >
                    job.step.outputs.__raw__
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
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
