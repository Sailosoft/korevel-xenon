/**
 * BFlowReportPreviewModal — Previews a generated markdown report using RenderView.
 *
 * Renders the markdown content via RenderView inside a modal, with a download
 * button to save the report as a .md file.
 */

"use client";

import React from "react";
import { Button, Modal } from "@heroui/react";
import { Download } from "lucide-react";
import { RenderView } from "@/src/modules/render";
import { bflowMarkdownComponents, bflowTableColors } from "./BFlowMarkdownTheme";

export interface BFlowReportPreviewModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Called when the modal is dismissed */
  onClose: () => void;
  /** The markdown content to render */
  content: string;
  /** Title for the modal header */
  title: string;
  /** Filename for the download (without extension) */
  downloadFilename?: string;
}

/**
 * Modal that renders markdown report content via RenderView and provides
 * a download button to save as .md file.
 */
export function BFlowReportPreviewModal({
  open,
  onClose,
  content,
  title,
  downloadFilename,
}: BFlowReportPreviewModalProps) {
  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${downloadFilename ?? "report"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal.Backdrop isOpen={open} onClick={onClose}>
      <Modal.Container>
        <Modal.Dialog
          className="max-w-4xl max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <Modal.CloseTrigger onClick={onClose} />
          <Modal.Header>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-foreground">
                {title}
              </span>
            </div>
            <p className="text-xs text-default-400 mt-0.5">
              Rendered as markdown &mdash; {content.split("\n").length} lines
            </p>
          </Modal.Header>

          <Modal.Body className="overflow-y-auto max-h-[70vh]">
            <div
              className="rounded-xl text-foreground"
              style={{ minHeight: 300, display: "flex", flexDirection: "column" }}
            >
              <RenderView format="markdown" content={content} markdownComponents={bflowMarkdownComponents} tableColors={bflowTableColors} />
            </div>
          </Modal.Body>

          <Modal.Footer>
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onPress={onClose}>
                Close
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onPress={handleDownload}
              >
                <Download className="w-4 h-4" />
                Download .md
              </Button>
            </div>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
