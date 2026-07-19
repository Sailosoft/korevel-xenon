/**
 * BFlowReportViewModal — Renders a report's output using RenderView.
 *
 * Provides a full-screen modal that resolves the report source to a step's
 * output and renders it using the RenderModule's RenderView component,
 * supporting all formats (markdown, plain, html, json, csv, etc.).
 */

"use client";

import React, { useMemo } from "react";
import { Button, Modal } from "@heroui/react";
import { RenderView } from "@/src/modules/render";
import { bflowMarkdownComponents, bflowTableColors } from "./BFlowMarkdownTheme";
import type { BFlowWorkflowReport, BFlowWorkflowJob } from "../workflow/BFlowWorkflow.Types";
import type { RenderFormat } from "@/src/modules/render";

export interface BFlowReportViewModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Called when the modal is dismissed */
  onClose: () => void;
  /** The report configuration */
  report: BFlowWorkflowReport;
  /** The content to render (step output) */
  content?: string;
  /** All workflow jobs (for resolving source to get outputType) */
  jobs: BFlowWorkflowJob[];
}

/**
 * Resolve the output format for a report by parsing its source and finding
 * the corresponding step's outputType. Defaults to "markdown".
 */
function resolveReportFormat(
  report: BFlowWorkflowReport,
  jobs: BFlowWorkflowJob[],
): RenderFormat {
  const source = report.source || "";
  const match = source.match(/^([^.]+)\.([^.]+?)(?:\.outputs\.([^.]+))?$/);
  if (!match) return "markdown";

  const jobName = match[1];
  const stepName = match[2];

  // Find the job and step definition to get the outputType
  const job = jobs.find((j) => j.name === jobName || j.id === jobName);
  if (!job) return "markdown";

  const step = job.steps?.find(
    (s) => s.name === stepName || s.id === stepName,
  );

  // Use step definition's outputType if defined
  if (step?.outputType) {
    return step.outputType as RenderFormat;
  }

  return "markdown";
}

/**
 * Modal that renders a report's step output using RenderView.
 * Resolves the output format from the source step's outputType
 * and displays the content with appropriate rendering.
 */
export function BFlowReportViewModal({
  open,
  onClose,
  report,
  content,
  jobs,
}: BFlowReportViewModalProps) {
  const format = useMemo(
    () => resolveReportFormat(report, jobs),
    [report, jobs],
  );

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
                Report: {report.label || report.name}
              </span>
              <p className="text-xs text-default-400 mt-0.5">
                source: {report.source} &mdash; format: {format}
              </p>
              {!content && (
                <p className="text-sm text-default-400 mt-1">
                  No output available for this report source. Run the workflow test first to see results.
                </p>
              )}
            </div>
          </Modal.Header>

          <Modal.Body className="overflow-y-auto max-h-[70vh]">
            {content ? (
              <div
                className="rounded-xl p-2 text-foreground"
                style={{ minHeight: 200, display: "flex", flexDirection: "column" }}
              >
                <RenderView format={format} content={content} markdownComponents={bflowMarkdownComponents} tableColors={bflowTableColors} />
              </div>
            ) : (
              <div className="text-center py-12 text-default-400 text-sm">
                <p>No report content available</p>
                <p className="text-xs mt-2">
                  Use the "Test Workflow" button to execute the pipeline first.
                </p>
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
