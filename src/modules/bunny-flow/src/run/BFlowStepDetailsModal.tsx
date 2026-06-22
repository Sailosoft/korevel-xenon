/**
 * BFlowStepDetailsModal — Full detail view of a step execution.
 *
 * Displays step configuration, prompts, inputs, computed variables,
 * AI output, and error information inside a HeroUI Modal.
 */

import React from "react";
import { Button, Modal } from "@heroui/react";
import { BFlowStatusBadge } from "./BFlowStatusBadge";
import type { BFlowStep } from "../workflow/BFlowWorkflow.Types";
import type { BFlowStepRun } from "./BFlowRun.Types";
import type { BFlowPipelineVariable } from "../pipeline/BFlowPipeline.Types";

export interface BFlowStepDetailsModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Called when the modal is dismissed */
  onClose: () => void;
  /** The workflow step definition */
  step: BFlowStep;
  /** The step run data (optional) */
  stepRun?: BFlowStepRun;
  /** Resolved pipeline variables for display */
  pipelineVariables: BFlowPipelineVariable[];
}

/**
 * Full detail modal for inspecting a step's configuration, prompts,
 * resolved inputs, computed variables, output, and errors.
 */
export function BFlowStepDetailsModal({
  open,
  onClose,
  step,
  stepRun,
  pipelineVariables,
}: BFlowStepDetailsModalProps) {
  return (
    <Modal isOpen={open}>
      <Modal.Backdrop onClick={onClose}>
        <Modal.Container>
          <Modal.Dialog
            className="max-w-2xl max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Modal.CloseTrigger onClick={onClose} />
            <Modal.Header>
              <div className="flex items-center gap-2">
                <span>Step Details</span>
                <BFlowStatusBadge status={stepRun?.status} />
              </div>
              <p className="text-sm text-default-500">
                {step.name} — Configuration and computed variables
              </p>
            </Modal.Header>

            <Modal.Body className="overflow-y-auto max-h-[65vh]">
              <div className="space-y-6">
                {/* ── Step Configuration ─────────────────────────── */}
                <section>
                  <h3 className="text-sm font-semibold text-default-700 mb-2">
                    Step Configuration
                  </h3>
                  <div className="bg-default-50 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-default-500">ID</span>
                      <span className="font-mono text-xs text-default-700">
                        {step.id}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-default-500">Name</span>
                      <span className="text-default-700">{step.name}</span>
                    </div>
                    {step.agent && (
                      <div className="flex justify-between">
                        <span className="text-default-500">Agent</span>
                        <span className="text-default-700">{step.agent}</span>
                      </div>
                    )}
                    {stepRun?.aiProvider && (
                      <div className="flex justify-between">
                        <span className="text-default-500">AI Provider</span>
                        <span className="text-default-700">
                          {stepRun.aiProvider}
                        </span>
                      </div>
                    )}
                    {stepRun?.aiModel && (
                      <div className="flex justify-between">
                        <span className="text-default-500">AI Model</span>
                        <span className="text-default-700">
                          {stepRun.aiModel}
                        </span>
                      </div>
                    )}
                  </div>
                </section>

                {/* ── Prompts ────────────────────────────────────── */}
                {step.prompts && (
                  <section>
                    <h3 className="text-sm font-semibold text-default-700 mb-2">
                      Prompts
                    </h3>
                    <pre className="bg-default-50 rounded-xl p-4 text-xs text-default-600 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
                      {Array.isArray(step.prompts)
                        ? step.prompts.join("\n\n---\n\n")
                        : step.prompts}
                    </pre>
                  </section>
                )}

                {/* ── Inputs ─────────────────────────────────────── */}
                {step.inputs && step.inputs.length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold text-default-700 mb-2">
                      Input Sources
                    </h3>
                    <div className="space-y-2">
                      {step.inputs.map((input) => (
                        <div
                          key={input.id}
                          className="bg-default-50 rounded-lg p-3 text-sm"
                        >
                          <div className="flex justify-between">
                            <span className="text-default-600 font-medium">
                              {input.name}
                            </span>
                            <span className="text-xs font-mono text-default-400">
                              {input.source}
                            </span>
                          </div>
                          {stepRun?.resolvedInputs?.[input.name] !==
                            undefined && (
                            <p className="text-xs text-default-500 mt-1">
                              Resolved:{" "}
                              {String(stepRun.resolvedInputs[input.name])}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* ── Computed Variables ─────────────────────────── */}
                {pipelineVariables.length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold text-default-700 mb-2">
                      Computed Variables
                    </h3>
                    <div className="bg-default-50 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-default-200">
                            <th className="text-left p-3 text-default-500 font-medium text-xs">
                              Name
                            </th>
                            <th className="text-left p-3 text-default-500 font-medium text-xs">
                              Value
                            </th>
                            <th className="text-left p-3 text-default-500 font-medium text-xs">
                              Type
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {pipelineVariables.map((v) => (
                            <tr
                              key={v.id}
                              className="border-b border-default-100 last:border-0"
                            >
                              <td className="p-3 font-medium text-default-700">
                                {v.name}
                              </td>
                              <td className="p-3 text-default-600 font-mono text-xs max-w-[200px] truncate">
                                {v.value}
                              </td>
                              <td className="p-3">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-default-100 text-default-600">
                                  {v.type}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {/* ── Output ─────────────────────────────────────── */}
                {stepRun?.output && (
                  <section>
                    <h3 className="text-sm font-semibold text-default-700 mb-2">
                      Output
                    </h3>
                    <pre className="bg-default-50 rounded-xl p-4 text-xs text-default-600 whitespace-pre-wrap font-mono max-h-60 overflow-y-auto">
                      {stepRun.output}
                    </pre>
                  </section>
                )}

                {/* ── Error ──────────────────────────────────────── */}
                {stepRun?.error && (
                  <section>
                    <h3 className="text-sm font-semibold text-danger mb-2">
                      Error
                    </h3>
                    <pre className="bg-danger-50 rounded-xl p-4 text-xs text-danger whitespace-pre-wrap font-mono">
                      {stepRun.error}
                    </pre>
                  </section>
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
