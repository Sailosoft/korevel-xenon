/**
 * BFlowRawYamlModal — Displays the raw workflow YAML schema in a modal.
 *
 * Provides a full-screen modal that renders the workflow template YAML
 * as syntax-highlighted code, with copy-to-clipboard support, enabling
 * users to inspect the raw pipeline definition.
 */

"use client";

import React, { useCallback, useState } from "react";
import { Button, Modal } from "@heroui/react";
import { Copy, Check, FileCode } from "lucide-react";

export interface BFlowRawYamlModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Called when the modal is dismissed */
  onClose: () => void;
  /** The raw YAML string to display */
  yaml: string;
  /** Optional label (e.g. template name) */
  label?: string;
}

/**
 * Modal that displays the raw workflow YAML schema in a code block
 * with copy-to-clipboard functionality.
 */
export function BFlowRawYamlModal({
  open,
  onClose,
  yaml,
  label,
}: BFlowRawYamlModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(yaml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write failed — silently ignore
    }
  }, [yaml]);

  return (
    <Modal.Backdrop isOpen={open} onClick={onClose}>
      <Modal.Container>
        <Modal.Dialog
          className="max-w-4xl max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <Modal.CloseTrigger onClick={onClose} />
          <Modal.Header>
            <div className="flex items-center gap-2">
              <FileCode className="w-5 h-5 text-amber-500" />
              <span className="text-lg font-semibold text-foreground">
                Raw YAML Schema
              </span>
            </div>
            {label && (
              <p className="text-xs text-default-400 mt-0.5">
                {label}
              </p>
            )}
          </Modal.Header>

          <Modal.Body className="overflow-y-auto max-h-[70vh]">
            <div className="relative">
              <button
                onClick={handleCopy}
                title="Copy YAML"
                className="absolute top-2 right-2 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-default-100 hover:bg-default-200 transition-colors text-xs font-medium text-default-600"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-success" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
              <pre className="bg-default-50 rounded-xl p-5 text-xs font-mono text-default-700 whitespace-pre-wrap overflow-x-auto leading-relaxed border border-default-100 max-h-[65vh] overflow-y-auto">
                <code>{yaml}</code>
              </pre>
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
  );
}
