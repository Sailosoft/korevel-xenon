// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCChatView.DetailView Sub-Component
// Error detail modal shown when the user clicks "View Details" on a failed message
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { Button, Modal } from "@heroui/react";
import {
  AlertTriangle,
  FileCode,
  Bug,
  XCircle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import type { LCErrorInfo } from "./LCInterface";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface LCChatViewDetailViewProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Called when the modal is dismissed */
  onClose: () => void;
  /** The error info to display */
  error: LCErrorInfo | null;
  /** Called when the user clicks the Retry button */
  onRetry?: (content: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LCChatViewDetailView({
  isOpen,
  onClose,
  error,
  onRetry,
}: LCChatViewDetailViewProps) {
  const [isStackExpanded, setIsStackExpanded] = useState(false);
  const [isFailedContentExpanded, setIsFailedContentExpanded] = useState(false);

  if (!error) return null;

  const handleRetry = () => {
    if (error.failedContent && onRetry) {
      onRetry(error.failedContent);
    }
    onClose();
  };

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Container className="bg-[#1e1e1e] border border-[#333] max-w-2xl w-[90vw]">
        <Modal.Dialog className="sm:max-w-[90vw] bg-[#1e1e1e] text-white">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading className="text-white flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-[#e06c75]" />
              Error Details
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body className="max-h-[70vh] overflow-y-auto">
            <div className="space-y-4">
              {/* Error Summary Card */}
              <div className="bg-[#e06c75]/10 border border-[#e06c75]/20 rounded-md p-3">
                <div className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-[#e06c75] mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-[#e06c75] font-medium uppercase tracking-wide mb-1">
                      {error.name || "Error"}
                    </p>
                    <p className="text-sm text-[#d4d4d4] whitespace-pre-wrap break-words">
                      {error.message}
                    </p>
                    <p className="text-[10px] text-[#858585] mt-2">
                      {error.timestamp.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stack Trace (collapsible) */}
              {error.stack && (
                <div className="border border-[#333333] rounded-md overflow-hidden">
                  <button
                    onClick={() => setIsStackExpanded(!isStackExpanded)}
                    className="flex items-center gap-2 w-full px-3 py-2 bg-[#252526] hover:bg-[#2d2d2d] transition-colors text-left"
                  >
                    {isStackExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-[#61afef] shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-[#61afef] shrink-0" />
                    )}
                    <Bug className="w-3.5 h-3.5 text-[#e5c07b] shrink-0" />
                    <span className="text-xs text-[#abb2bf] font-medium">Stack Trace</span>
                  </button>
                  {isStackExpanded && (
                    <pre className="text-[11px] text-[#858585] p-3 bg-[#1e1e1e] overflow-x-auto whitespace-pre-wrap break-all max-h-[300px] overflow-y-auto font-mono leading-relaxed">
                      {error.stack}
                    </pre>
                  )}
                </div>
              )}

              {/* Failed Content (collapsible) */}
              {error.failedContent && (
                <div className="border border-[#333333] rounded-md overflow-hidden">
                  <button
                    onClick={() => setIsFailedContentExpanded(!isFailedContentExpanded)}
                    className="flex items-center gap-2 w-full px-3 py-2 bg-[#252526] hover:bg-[#2d2d2d] transition-colors text-left"
                  >
                    {isFailedContentExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-[#61afef] shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-[#61afef] shrink-0" />
                    )}
                    <FileCode className="w-3.5 h-3.5 text-[#98c379] shrink-0" />
                    <span className="text-xs text-[#abb2bf] font-medium">Failed Request Content</span>
                  </button>
                  {isFailedContentExpanded && (
                    <pre className="text-[11px] text-[#d4d4d4] p-3 bg-[#1e1e1e] overflow-x-auto whitespace-pre-wrap break-all max-h-[300px] overflow-y-auto font-mono leading-relaxed">
                      {error.failedContent}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              slot="close"
              variant="ghost"
              className="bg-transparent text-gray-300 hover:bg-[#333] text-xs"
            >
              Close
            </Button>
            {error.failedContent && onRetry && (
              <Button
                slot="close"
                onPress={handleRetry}
                className="bg-[#e5c07b] text-black hover:bg-[#d1a85e] text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Request
              </Button>
            )}
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
