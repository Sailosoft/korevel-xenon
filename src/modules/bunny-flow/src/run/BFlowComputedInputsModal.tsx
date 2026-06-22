/**
 * BFlowComputedInputsModal — Displays the final resolved prompts that were
 * sent to the AI, along with the resolved input values.
 *
 * The primary focus is showing the **final prompt text** (system + user) with
 * all variables, cross-step outputs, and inputs fully resolved/substituted.
 * Also shows the individual resolved input values for debugging.
 */

import React from "react";
import { Button, Modal } from "@heroui/react";
import { Code, Variable, Brain } from "lucide-react";
import type { BFlowStepRun } from "./BFlowRun.Types";
import type { BFlowStep } from "../workflow/BFlowWorkflow.Types";

export interface BFlowComputedInputsModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Called when the modal is dismissed */
  onClose: () => void;
  /** The workflow step definition */
  step: BFlowStep;
  /** The step run data containing resolved inputs and prompts */
  stepRun?: BFlowStepRun;
}

/**
 * Modal that displays the final resolved prompts sent to the AI,
 * plus the individual resolved input values.
 */
export function BFlowComputedInputsModal({
  open,
  onClose,
  step,
  stepRun,
}: BFlowComputedInputsModalProps) {
  const resolvedInputs = stepRun?.resolvedInputs;
  const inputDefs = step.inputs;
  const hasInputs = inputDefs && inputDefs.length > 0;
  const hasResolvedInputs =
    resolvedInputs && Object.keys(resolvedInputs).length > 0;
  const hasPrompts =
    stepRun?.resolvedSystemPrompt || stepRun?.resolvedUserPrompt;

  return (
    <Modal isOpen={open}>
      <Modal.Backdrop onClick={onClose}>
        <Modal.Container>
          <Modal.Dialog
            className="max-w-3xl max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Modal.CloseTrigger onClick={onClose} />
            <Modal.Header>
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                <span className="text-lg font-semibold text-foreground">
                  Final Resolved Prompt
                </span>
              </div>
              <p className="text-sm text-default-500 mt-0.5">
                {step.name} — The complete prompt text sent to the AI with all
                variables and cross-step outputs resolved
              </p>
            </Modal.Header>

            <Modal.Body className="overflow-y-auto max-h-[70vh]">
              <div className="space-y-6">
                {/* ── Resolved System Prompt ──────────────────────── */}
                {stepRun?.resolvedSystemPrompt ? (
                  <section>
                    <h3 className="text-sm font-semibold text-default-700 mb-2 flex items-center gap-1.5">
                      <Code className="w-4 h-4 text-primary" />
                      System Prompt
                    </h3>
                    <pre className="bg-primary-50 rounded-xl p-4 text-xs text-primary-800 whitespace-pre-wrap font-mono max-h-60 overflow-y-auto border border-primary-200">
                      {stepRun.resolvedSystemPrompt}
                    </pre>
                  </section>
                ) : (
                  <section>
                    <h3 className="text-sm font-semibold text-default-700 mb-2">
                      System Prompt
                    </h3>
                    <p className="text-xs text-default-400 italic bg-default-50 rounded-xl p-4">
                      {stepRun?.status === "pending"
                        ? "Not yet resolved — step has not been executed"
                        : "Not available"}
                    </p>
                  </section>
                )}

                {/* ── Resolved User Prompt ────────────────────────── */}
                {stepRun?.resolvedUserPrompt ? (
                  <section>
                    <h3 className="text-sm font-semibold text-default-700 mb-2 flex items-center gap-1.5">
                      <Code className="w-4 h-4 text-success" />
                      User Prompt
                    </h3>
                    <pre className="bg-success-50 rounded-xl p-4 text-xs text-success-800 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto border border-success-200">
                      {stepRun.resolvedUserPrompt}
                    </pre>
                  </section>
                ) : (
                  <section>
                    <h3 className="text-sm font-semibold text-default-700 mb-2">
                      User Prompt
                    </h3>
                    <p className="text-xs text-default-400 italic bg-default-50 rounded-xl p-4">
                      {stepRun?.status === "pending"
                        ? "Not yet resolved — step has not been executed"
                        : "Not available"}
                    </p>
                  </section>
                )}

                {/* ── Resolved Inputs ────────────────────────────── */}
                {hasInputs && (
                  <section>
                    <h3 className="text-sm font-semibold text-default-700 mb-2 flex items-center gap-1.5">
                      <Variable className="w-4 h-4 text-default-500" />
                      Resolved Input Values
                    </h3>
                    <div className="space-y-2">
                      {inputDefs!.map((input) => {
                        const resolvedValue =
                          resolvedInputs?.[input.name] !== undefined
                            ? String(resolvedInputs[input.name])
                            : undefined;

                        return (
                          <div
                            key={input.id ?? input.name}
                            className="bg-default-50 rounded-lg p-3 border border-default-100"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-default-700">
                                {input.name}
                              </span>
                              <span className="text-xs font-mono text-default-400">
                                {input.source}
                              </span>
                            </div>
                            {resolvedValue !== undefined ? (
                              <pre className="text-xs text-default-600 font-mono bg-background rounded-lg px-2 py-1 border border-default-200 whitespace-pre-wrap break-all">
                                {resolvedValue}
                              </pre>
                            ) : (
                              <p className="text-xs text-default-400 italic">
                                Not yet resolved
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {!hasInputs && !hasPrompts && (
                  <div className="text-center py-12">
                    <Brain className="w-12 h-12 text-default-200 mx-auto mb-4" />
                    <p className="text-default-400 text-sm">
                      No prompts or inputs available for this step
                    </p>
                  </div>
                )}
              </div>
            </Modal.Body>

            <Modal.Footer>
              <Button variant="outline" className="w-full" onPress={onClose}>
                Close
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
