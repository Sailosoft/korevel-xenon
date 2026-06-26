/**
 * BFlowWorkflowInteractive.AgentFormModal — Modal form for creating/editing an AI agent definition.
 */

"use client";

import React, { useCallback, useEffect, useId, useState } from "react";
import { Button, Input, Label, TextArea } from "@heroui/react";
import type { BFlowInteractiveAgent } from "./BFlowWorkflowInteractive.Types";

interface BFlowAgentFormModalProps {
  open: boolean;
  agent: BFlowInteractiveAgent;
  onClose: () => void;
  onSave: (agent: BFlowInteractiveAgent) => void;
}

export function BFlowAgentFormModal({
  open,
  agent,
  onClose,
  onSave,
}: BFlowAgentFormModalProps) {
  const [form, setForm] = useState<BFlowInteractiveAgent>({ ...agent });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync form state when agent prop changes (e.g. opening modal for a different agent to edit)
  useEffect(() => {
    setForm({ ...agent });
    setErrors({});
  }, [agent]);

  // Generate unique IDs for proper ARIA labeling
  const agentNameLabelId = useId();
  const roleLabelId = useId();
  const systemPromptLabelId = useId();

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Agent name is required";
    if (!form.prompt.trim()) errs.prompt = "Agent prompt is required";
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
              {agent.name ? "Edit Agent" : "Add Agent"}
            </h3>
            <p className="text-xs text-default-400 mt-0.5">
              Configure the AI agent definition
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
              <Label id={agentNameLabelId} className="text-xs font-medium">
                Agent Name *
              </Label>
              <Input
                aria-labelledby={agentNameLabelId}
                placeholder="e.g. writer"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              {errors.name && (
                <p className="text-xs text-danger">{errors.name}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label id={roleLabelId} className="text-xs font-medium">
                Role (optional)
              </Label>
              <Input
                aria-labelledby={roleLabelId}
                placeholder="e.g. Technical Writer"
                value={form.role ?? ""}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label id={systemPromptLabelId} className="text-xs font-medium">
              System Prompt *
            </Label>
            <TextArea
              aria-labelledby={systemPromptLabelId}
              placeholder="Enter the agent system prompt"
              value={form.prompt}
              onChange={(e) => setForm({ ...form, prompt: e.target.value })}
              className="min-h-[120px]"
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
            Save Agent
          </Button>
        </div>
      </div>
    </div>
  );
}
