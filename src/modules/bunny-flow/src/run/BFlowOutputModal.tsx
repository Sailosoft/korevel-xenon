/**
 * BFlowOutputModal — Renders step output using react-markdown.
 *
 * Provides a full-screen modal view of a step's AI output with proper
 * markdown rendering via the `react-markdown` library.
 */

import React from "react";
import { Button, Modal } from "@heroui/react";
import ReactMarkdown from "react-markdown";
import type { BFlowStepRun } from "./BFlowRun.Types";
import type { BFlowStep } from "../workflow/BFlowWorkflow.Types";

export interface BFlowOutputModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Called when the modal is dismissed */
  onClose: () => void;
  /** The workflow step definition */
  step: BFlowStep;
  /** The step run data containing the output */
  stepRun?: BFlowStepRun;
}

/**
 * Modal that renders step output using react-markdown.
 * Displays the step name, AI provider/model info, and the rendered output.
 */
export function BFlowOutputModal({
  open,
  onClose,
  step,
  stepRun,
}: BFlowOutputModalProps) {
  const output = stepRun?.output;

  return (
    <Modal.Backdrop isOpen={open} onClick={onClose}>
      <Modal.Container>
        <Modal.Dialog
          className="max-w-4xl max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <Modal.CloseTrigger onClick={onClose} />
          <Modal.Header>
            <div>
              <span className="text-lg font-semibold text-foreground">
                Output: {step.name}
              </span>
              {stepRun?.aiProvider && stepRun?.aiModel && (
                <p className="text-xs text-default-400 mt-0.5">
                  {stepRun.aiProvider} — {stepRun.aiModel}
                </p>
              )}
              {!output && (
                <p className="text-sm text-default-400 mt-1">
                  No output available for this step
                </p>
              )}
            </div>
          </Modal.Header>

          <Modal.Body className="overflow-y-auto max-h-[70vh]">
            {output ? (
              <div className="prose prose-sm max-w-none prose-neutral dark:prose-invert rounded-xl p-6 text-foreground" >
              {/* // <div className="prose prose-sm max-w-none rounded-xl p-6"> */}
                <ReactMarkdown>{output}</ReactMarkdown>
              </div>
            ) : (
              <div className="text-center py-12 text-default-400 text-sm">
                No output to display
              </div>
            )}
          </Modal.Body>

          <Modal.Footer>
            <Button variant="outline" className="w-full" onPress={onClose}>
              Close
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
