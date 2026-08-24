/**
 * BFlowRunVariablesModal — Modal form for overriding workflow variables
 * before running a workflow as a session run directly from the studio.
 *
 * Builds one field per variable parsed from the live workflow YAML so the
 * user can fill in / override values that are then used for that specific
 * run (and registered as a session run in IndexedDB).
 *
 * The parent mounts this component only while it is open, so form state is
 * lazily initialised from the current variable defaults on every open.
 */

"use client";

import React, { useCallback, useState } from "react";
import { Button, Input, Label, Modal, Switch, TextArea } from "@heroui/react";
import { SlidersHorizontal, Play, Loader2 } from "lucide-react";
import type { BFlowPipelineVariable } from "../pipeline/BFlowPipeline.Types";

interface BFlowRunVariablesModalProps {
  /** Variables (from the studio's live YAML) to display as override fields */
  variables: BFlowPipelineVariable[];
  /** Whether a run is currently in progress (disables the form submit) */
  isRunning?: boolean;
  /** Called when the modal is dismissed */
  onClose: () => void;
  /** Called with the overridden variables when the user confirms the run */
  onConfirm: (variables: BFlowPipelineVariable[]) => void;
}

/**
 * Modal that renders a variable override form for a studio session run.
 */
export function BFlowRunVariablesModal({
  variables,
  isRunning = false,
  onClose,
  onConfirm,
}: BFlowRunVariablesModalProps) {
  // Lazy-initialised form values keyed by variable name (boolean stored as
  // "true"/"false"). The parent remounts this component each time the modal
  // is opened, so state always starts from the current variable defaults.
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const v of variables) {
      initial[v.name] = v.value ?? "";
    }
    return initial;
  });

  const setValue = useCallback((name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleConfirm = useCallback(() => {
    const overrides: BFlowPipelineVariable[] = variables.map((v) => ({
      ...v,
      value: values[v.name] ?? v.value ?? "",
    }));
    onConfirm(overrides);
  }, [variables, values, onConfirm]);

  return (
    <Modal isOpen>
      <Modal.Backdrop onClick={onClose}>
        <Modal.Container>
          <Modal.Dialog
            className="max-w-xl max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Modal.CloseTrigger onClick={onClose} />
            <Modal.Header>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-primary" />
                <span className="text-lg font-semibold text-foreground">
                  Run with Variable Overrides
                </span>
              </div>
              <p className="text-sm text-default-500 mt-0.5">
                Fill in values to override the workflow variables for this run.
                The run will be registered as a session.
              </p>
            </Modal.Header>

            <Modal.Body className="overflow-y-auto max-h-[60vh]">
              {variables.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-default-400 text-sm">
                    This workflow has no variables to override.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {variables.map((v) => (
                    <div key={v.name} className="flex flex-col gap-1.5">
                      <Label className="text-xs font-medium">
                        {v.name}
                        {v.description ? (
                          <span className="text-default-400 font-normal">
                            {" "}
                            — {v.description}
                          </span>
                        ) : null}
                      </Label>

                      {v.type === "boolean" ? (
                        <div className="flex items-center gap-3">
                          <Switch
                            isSelected={
                              (values[v.name] ?? v.value ?? "") === "true"
                            }
                            onChange={(val) =>
                              setValue(v.name, val ? "true" : "false")
                            }
                          />
                          <span className="text-xs text-default-500">
                            {(values[v.name] ?? v.value ?? "") === "true"
                              ? "Enabled"
                              : "Disabled"}
                          </span>
                        </div>
                      ) : v.type === "textarea" ? (
                        <TextArea
                          placeholder={`${v.name} value`}
                          value={values[v.name] ?? ""}
                          onChange={(e) => setValue(v.name, e.target.value)}
                          className="min-h-[90px]"
                        />
                      ) : (
                        <Input
                          type={v.type === "number" ? "number" : "text"}
                          placeholder={`${v.name} value`}
                          value={values[v.name] ?? ""}
                          onChange={(e) => setValue(v.name, e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Modal.Body>

            <Modal.Footer>
              <div className="flex items-center justify-end gap-2 w-full">
                <Button
                  onPress={onClose}
                  variant="ghost"
                  size="sm"
                  className="text-default-500"
                  isDisabled={isRunning}
                >
                  Cancel
                </Button>
                <Button
                  onPress={handleConfirm}
                  variant="primary"
                  size="sm"
                  isDisabled={isRunning || variables.length === 0}
                >
                  {isRunning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {isRunning ? "Running..." : "Run with Overrides"}
                </Button>
              </div>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
