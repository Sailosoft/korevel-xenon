/**
 * BFlowHtmlPreviewModal — Previews the generated Tailwind HTML export in an iframe.
 *
 * Generates the HTML document using BFlowTailwindExportService and displays it
 * inside a sandboxed iframe within a modal. Provides a download button for
 * saving the report as an HTML file.
 */

"use client";

import React, { useEffect, useState } from "react";
import { Button, Modal } from "@heroui/react";
import { Download, Eye } from "lucide-react";
import { bflowTailwindExportService } from "../export/BFlowExport.TailwindService";
import type {
  BFlowTailwindExportInput,
  BFlowTailwindExportOptions,
} from "../export/BFlowExport.TailwindService";

export interface BFlowHtmlPreviewModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Called when the modal is dismissed */
  onClose: () => void;
  /** The export input data */
  input: BFlowTailwindExportInput;
  /** Optional export options */
  options?: BFlowTailwindExportOptions;
  /** Optional filename for download */
  filename?: string;
}

/**
 * Modal that generates and previews the Tailwind HTML export in an iframe.
 * Also provides a download button to save the HTML file.
 */
export function BFlowHtmlPreviewModal({
  open,
  onClose,
  input,
  options,
  filename,
}: BFlowHtmlPreviewModalProps) {
  const [htmlUrl, setHtmlUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Generate the HTML blob URL when the modal opens
  useEffect(() => {
    if (!open) {
      // Clean up URL when modal closes
      if (htmlUrl) {
        URL.revokeObjectURL(htmlUrl);
        setHtmlUrl(null);
      }
      return;
    }

    setGenerating(true);

    // Use a micro-task to avoid blocking render
    const id = setTimeout(() => {
      try {
        const blob = bflowTailwindExportService.exportToBlob(input, options);
        const url = URL.createObjectURL(blob);
        setHtmlUrl(url);
      } catch {
        // Generation failed silently
      } finally {
        setGenerating(false);
      }
    }, 0);

    return () => {
      clearTimeout(id);
    };
  }, [open]); // Only regenerate on open/close, not on input changes

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (htmlUrl) URL.revokeObjectURL(htmlUrl);
    };
  }, []);

  const handleDownload = () => {
    bflowTailwindExportService.download(
      input,
      filename ?? `${input.pipelineName ?? "pipeline-report"}.html`,
      options,
    );
  };

  return (
    <Modal.Backdrop isOpen={open} onClick={onClose}>
      <Modal.Container>
        <Modal.Dialog
          className="max-w-5xl max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <Modal.CloseTrigger onClick={onClose} />
          <Modal.Header>
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-emerald-500" />
              <span className="text-lg font-semibold text-foreground">
                HTML Report Preview
              </span>
            </div>
            <p className="text-xs text-default-400 mt-0.5">
              {input.pipelineName} &mdash; rendered with Tailwind CSS
            </p>
          </Modal.Header>

          <Modal.Body className="overflow-hidden p-0" style={{ minHeight: "60vh" }}>
            {generating ? (
              <div className="flex items-center justify-center h-64 text-default-400 text-sm">
                Generating preview...
              </div>
            ) : htmlUrl ? (
              <iframe
                src={htmlUrl}
                className="w-full border-0"
                style={{ height: "70vh" }}
                title="HTML Report Preview"
                sandbox="allow-scripts allow-same-origin"
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-default-400 text-sm">
                Failed to generate preview
              </div>
            )}
          </Modal.Body>

          <Modal.Footer>
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onPress={onClose}
              >
                Close
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onPress={handleDownload}
                isDisabled={!htmlUrl}
              >
                <Download className="w-4 h-4" />
                Download HTML
              </Button>
            </div>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
