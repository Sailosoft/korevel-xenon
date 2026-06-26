/**
 * BFlowWorkflowInteractive.VariableFormModal — Modal form for creating/editing a workflow variable.
 */

"use client";

import React, { useCallback, useEffect, useId, useState } from "react";
import { Button, Input, Label, Switch, Select, ListBox } from "@heroui/react";
import type { BFlowInteractiveVariable } from "./BFlowWorkflowInteractive.Types";
import { VARIABLE_TYPE_OPTIONS } from "./BFlowWorkflowInteractive.Types";

interface BFlowVariableFormModalProps {
  open: boolean;
  variable: BFlowInteractiveVariable;
  onClose: () => void;
  onSave: (variable: BFlowInteractiveVariable) => void;
}

export function BFlowVariableFormModal({
  open,
  variable,
  onClose,
  onSave,
}: BFlowVariableFormModalProps) {
  const [form, setForm] = useState<BFlowInteractiveVariable>({ ...variable });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync form state when variable prop changes (e.g. opening modal for a different variable to edit)
  useEffect(() => {
    setForm({ ...variable });
    setErrors({});
  }, [variable]);

  // Generate unique IDs for proper ARIA labeling
  const varNameLabelId = useId();
  const varTypeLabelId = useId();
  const varDefaultValueLabelId = useId();
  const varDescriptionLabelId = useId();
  const varSwitchLabelId = useId();

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Variable name is required";
    if (!form.value.trim() && form.type !== "boolean")
      errs.value = "Default value is required";
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
              {variable.name ? "Edit Variable" : "Add Variable"}
            </h3>
            <p className="text-xs text-default-400 mt-0.5">
              Configure the workflow variable
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
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label id={varNameLabelId} className="text-xs font-medium">
                Name *
              </Label>
              <Input
                aria-labelledby={varNameLabelId}
                placeholder="e.g. topic"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              {errors.name && (
                <p className="text-xs text-danger">{errors.name}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label id={varTypeLabelId} className="text-xs font-medium">
                Type
              </Label>
              <Select
                aria-labelledby={varTypeLabelId}
                value={form.type}
                onChange={(val) =>
                  setForm({
                    ...form,
                    type: val as BFlowInteractiveVariable["type"],
                  })
                }
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox aria-labelledby={varTypeLabelId}>
                    {VARIABLE_TYPE_OPTIONS.map((opt) => (
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
          </div>

          {form.type === "boolean" ? (
            <div className="flex items-center gap-3">
              <Switch
                aria-labelledby={varSwitchLabelId}
                isSelected={form.value === "true"}
                onChange={(val) =>
                  setForm({ ...form, value: val ? "true" : "false" })
                }
              />
              <Label id={varSwitchLabelId} className="text-sm cursor-pointer">
                Default value (enabled)
              </Label>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label
                id={varDefaultValueLabelId}
                className="text-xs font-medium"
              >
                Default Value *
              </Label>
              <Input
                aria-labelledby={varDefaultValueLabelId}
                placeholder="Enter default value"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
              />
              {errors.value && (
                <p className="text-xs text-danger">{errors.value}</p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label id={varDescriptionLabelId} className="text-xs font-medium">
              Description (optional)
            </Label>
            <Input
              aria-labelledby={varDescriptionLabelId}
              placeholder="Describe the variable purpose"
              value={form.description ?? ""}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
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
            Save Variable
          </Button>
        </div>
      </div>
    </div>
  );
}
