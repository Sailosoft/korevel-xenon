/**
 * BFlowOutputModal — Renders step/report output using RenderView.
 *
 * Provides a full-screen modal view of step/report output with proper
 * rendering via the RenderModule's RenderView component, which supports
 * markdown, plain, html, json, csv, and other formats.
 */

import React from "react";
import { Button, Modal } from "@heroui/react";
import { RenderView } from "@/src/modules/render";
import type { BFlowStepRun } from "./BFlowRun.Types";
import type { BFlowStep } from "../workflow/BFlowWorkflow.Types";
import type { RenderFormat } from "@/src/modules/render";

export interface BFlowOutputModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Called when the modal is dismissed */
  onClose: () => void;
  /** The workflow step definition */
  step: BFlowStep;
  /** The step run data containing the output */
  stepRun?: BFlowStepRun;
  /** Optional override for the output format (defaults to step outputType or "markdown") */
  outputType?: RenderFormat;
}

/**
 * Modal that renders step/report output using RenderView.
 * Displays the step name, AI provider/model info, and the rendered output.
 * Supports all RenderFormat types (markdown, plain, html, json, csv, etc.)
 */
export function BFlowOutputModal({
  open,
  onClose,
  step,
  stepRun,
  outputType,
}: BFlowOutputModalProps) {
  const output = stepRun?.output;
  const format: RenderFormat =
    outputType ?? (step.outputType as RenderFormat) ?? "markdown";

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
              <p className="text-xs text-default-400 mt-0.5">
                Format: {format}
              </p>
              {!output && (
                <p className="text-sm text-default-400 mt-1">
                  No output available
                </p>
              )}
            </div>
          </Modal.Header>

          <Modal.Body className="overflow-y-auto max-h-[70vh]">
            {output ? (
              <div className="rounded-xl p-6 text-foreground" style={{ minHeight: 200, display: "flex", flexDirection: "column" }}>
                <RenderView format={format} content={output} />
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
