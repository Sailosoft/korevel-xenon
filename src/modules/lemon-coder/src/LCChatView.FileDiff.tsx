// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCChatView.FileDiff Sub-Component
// Inline diff display and "View All Changes" modal for file actions
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button, Chip, Modal } from "@heroui/react";
import {
  Loader2,
  Check,
  FileCode,
  ArrowLeftRight,
  ChevronsUpDown,
  GitMerge,
  ListTree,
  Eye,
  CheckCheck,
} from "lucide-react";
import LCDiffDisplay from "./LCDiffDisplay";
import type { LCFileActionResult, LCApplyStatus } from "./LCInterface";
import { resolveFilePath } from "./LCInterface";
import { applySearchReplace } from "./useLCChat";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build the display file path from a file action (normalises double slashes) */
function getFilePath(file: LCFileActionResult): string {
  return resolveFilePath(file);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  InlineFileDiff – expandable diff row inside a chat message
// ═══════════════════════════════════════════════════════════════════════════════

export interface InlineFileDiffProps {
  /** The message id this file action belongs to */
  msgId: string;
  /** Index of this file action within the message */
  idx: number;
  /** The file action data */
  file: LCFileActionResult;
  /** Called when user clicks Apply on this specific file */
  onApplyFileChanges: (fileActions: LCFileActionResult[]) => void;
  /** Called when user clicks the Diff button to open a full Monaco diff */
  onPreviewDiff?: (fileAction: LCFileActionResult) => void;
  /** Callback to read the original file content from disk */
  onReadFileForDiff?: (filePath: string) => Promise<string>;
}

const applyStatusConfig: Record<LCApplyStatus, { label: string; color: string; icon: React.ReactNode }> = {
  apply: { label: "Apply", color: "text-[#98c379] hover:bg-[#98c379]/10", icon: <Check className="w-3 h-3" /> },
  applying: { label: "Applying...", color: "text-[#e5c07b] hover:bg-[#e5c07b]/10", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  applied: { label: "Applied", color: "text-[#858585] hover:bg-[#858585]/10", icon: <CheckCheck className="w-3 h-3" /> },
};

export function InlineFileDiff({
  msgId,
  idx,
  file,
  onApplyFileChanges,
  onPreviewDiff,
  onReadFileForDiff,
}: InlineFileDiffProps) {
  // undefined = collapsed, "loading" = loading, string|null = loaded content
  const [diffState, setDiffState] = useState<string | null | "loading" | undefined>(undefined);
  const [localApplyStatus, setLocalApplyStatus] = useState<LCApplyStatus>(file.applyStatus ?? "apply");

  const handleToggle = useCallback(async () => {
    if (diffState !== undefined) {
      // Already expanded — collapse
      setDiffState(undefined);
      return;
    }

    // Mark as loading
    setDiffState("loading");

    // Read original content
    let originalContent: string | null = null;
    const filePath = getFilePath(file);

    if (onReadFileForDiff && file.ExistingFile) {
      try {
        originalContent = await onReadFileForDiff(filePath);
      } catch {
        // Fall through — show all as new
      }
    }

    setDiffState(originalContent ?? "");
  }, [diffState, file, onReadFileForDiff]);

  const handleApply = useCallback(() => {
    if (localApplyStatus !== "apply") return;
    setLocalApplyStatus("applying");

    // Defensively copy primitives — do NOT rely on spread which could
    // carry over unexpected properties from a mutated source object.
    const action: LCFileActionResult = {
      FileName: file.FileName,
      ExistingFile: file.ExistingFile,
      FileDirectory: file.FileDirectory,
      Description: file.Description,
      Content: file.Content,
      Edits: file.Edits,
      applyStatus: "applied",
    };
    onApplyFileChanges([action]);

    // The parent will trigger a re-render eventually; optimistically mark as applied
    setTimeout(() => setLocalApplyStatus("applied"), 500);
  }, [file, localApplyStatus, onApplyFileChanges]);

  const statusStyle = applyStatusConfig[localApplyStatus];

  return (
    <div>
      {/* File action header row */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={handleToggle}
          className="flex items-center gap-1.5 text-xs text-[#abb2bf] hover:text-[#e5c07b] transition-colors text-left flex-1 min-w-0 group"
        >
          <FileCode className="w-3 h-3 text-[#e5c07b] shrink-0" />
          <span className="truncate max-w-[150px] group-hover:underline decoration-dotted underline-offset-2">
            {getFilePath(file)}
          </span>
          {localApplyStatus === "applied" && (
            <Chip
              size="sm"
              variant="soft"
              className="text-[10px] h-5 bg-[#98c379]/20 text-[#98c379]"
            >
              <CheckCheck className="w-2.5 h-2.5 inline mr-0.5" />
              Applied
            </Chip>
          )}
          {localApplyStatus !== "applied" && (
            <Chip
              size="sm"
              variant="soft"
              className={`text-[10px] h-5 ${
                file.ExistingFile
                  ? "bg-[#e5c07b]/10 text-[#e5c07b]"
                  : "bg-[#98c379]/10 text-[#98c379]"
              }`}
            >
              {file.ExistingFile ? "Update" : "New"}
            </Chip>
          )}
        </button>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {onPreviewDiff && localApplyStatus !== "applied" && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-6 text-[#61afef] hover:bg-[#61afef]/10"
              onPress={() => onPreviewDiff(file)}
            >
              <ArrowLeftRight className="w-3 h-3" />
              Diff
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className={`text-xs h-6 ${statusStyle.color}`}
            isDisabled={localApplyStatus !== "apply"}
            onPress={handleApply}
          >
            {statusStyle.icon}
            {statusStyle.label}
          </Button>
        </div>
      </div>

      {/* Inline diff display */}
      {diffState !== null && diffState !== "loading" && diffState !== undefined && (
        <div className="mt-2">
          {(() => {
            const hasEdits = Array.isArray(file.Edits) && file.Edits.length > 0;
            let modified = file.Content ?? "";
            let showWarning = false;

            // If Content is empty but Edits exist, try to reconstruct
            if (!modified && hasEdits && diffState) {
              try {
                modified = applySearchReplace(diffState, file.Edits!).content;
              } catch {
                // SEARCH/REPLACE failed — build a best-effort preview from Replace blocks
                showWarning = true;
                const replaceBlocks = file.Edits!.map((e, i) => {
                  const desc = e.Description || `Edit ${i + 1}`;
                  return `// === AI: ${desc} ===\n${e.Replace}`;
                }).join("\n\n");

                modified = [
                  "// ═══════════════════════════════════════════════════════════",
                  `// ⚠ SEARCH/REPLACE could not match the current file content.`,
                  `// Below are the AI's intended replacements as a raw preview.`,
                  "// ═══════════════════════════════════════════════════════════",
                  "",
                  replaceBlocks,
                ].join("\n");
              }
            }

            return (
              <>
                {showWarning && (
                  <div className="px-3 py-1.5 text-[10px] text-[#e06c75] bg-[#e06c75]/5 border-b border-[#e06c75]/20 rounded-t-md">
                    ⚠ SEARCH/REPLACE couldn't preview — showing AI's Replace blocks as a raw preview. Verify and apply manually.
                  </div>
                )}
                <LCDiffDisplay
                  original={diffState}
                  modified={modified}
                  fileName={getFilePath(file)}
                  isExisting={file.ExistingFile}
                  defaultCollapsed={false}
                />
              </>
            );
          })()}
        </div>
      )}
      {diffState === "loading" && (
        <div className="mt-2 flex items-center gap-2 px-3 py-2 text-[11px] text-[#858585] bg-[#252526] rounded-md">
          <Loader2 className="w-3 h-3 animate-spin" />
          Loading diff...
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ViewAllChangesModal – full-screen modal showing all pending file diffs
// ═══════════════════════════════════════════════════════════════════════════════

export interface ViewAllChangesModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Called when the modal is dismissed */
  onClose: () => void;
  /** The file actions from the latest assistant message (or null if none) */
  latestFileActions: LCFileActionResult[] | null;
  /** Called when user clicks Accept on one or all files */
  onApplyFileChanges: (fileActions: LCFileActionResult[]) => void;
  /** Callback to open a full Monaco diff preview for a file */
  onPreviewDiff?: (fileAction: LCFileActionResult) => void;
  /** Callback to read the original file content from disk */
  onReadFileForDiff?: (filePath: string) => Promise<string>;
}

export function ViewAllChangesModal({
  isOpen,
  onClose,
  latestFileActions,
  onApplyFileChanges,
  onPreviewDiff,
  onReadFileForDiff,
}: ViewAllChangesModalProps) {
  const [viewAllDiffs, setViewAllDiffs] = useState<Record<string, string | null | "loading">>({});
  const [viewAllExpanded, setViewAllExpanded] = useState(false);
  const [viewAllToggleKey, setViewAllToggleKey] = useState(0);
  const prevOpenRef = useRef(isOpen);
  // Track per-file apply status in the View All modal
  const [fileApplyStatuses, setFileApplyStatuses] = useState<Record<number, LCApplyStatus>>({});

  // Load diffs when the modal opens
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      // Modal just opened — pre-load all diffs
      setViewAllDiffs({});
      setViewAllExpanded(false);
      setViewAllToggleKey((k) => k + 1);

      if (latestFileActions) {
        const loadAllDiffs = async () => {
          const newDiffs: Record<string, string | null | "loading"> = {};
          for (let idx = 0; idx < latestFileActions.length; idx++) {
            const file = latestFileActions[idx];
            const diffKey = `all:${idx}`;
            newDiffs[diffKey] = "loading";

            let originalContent: string | null = null;
            const filePath = getFilePath(file);

            if (onReadFileForDiff && file.ExistingFile) {
              try {
                originalContent = await onReadFileForDiff(filePath);
              } catch {
                // Fall through — show all as new
              }
            }
            newDiffs[diffKey] = originalContent ?? "";
          }
          setViewAllDiffs(newDiffs);
        };
        loadAllDiffs();
      }
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, latestFileActions, onReadFileForDiff]);

  const handleAcceptAll = useCallback(() => {
    if (latestFileActions && latestFileActions.length > 0) {
      // Mark all as applying
      const applyingStatuses: Record<number, LCApplyStatus> = {};
      latestFileActions.forEach((_, idx) => { applyingStatuses[idx] = "applying"; });
      setFileApplyStatuses(applyingStatuses);

      // Apply changes — defensively copy every action
      onApplyFileChanges(
        latestFileActions.map((f) => ({
          FileName: f.FileName,
          ExistingFile: f.ExistingFile,
          FileDirectory: f.FileDirectory,
          Description: f.Description,
          Content: f.Content,
          Edits: f.Edits,
          applyStatus: "applied",
        })),
      );

      // Mark all as applied after a short delay
      setTimeout(() => {
        const appliedStatuses: Record<number, LCApplyStatus> = {};
        latestFileActions.forEach((_, idx) => { appliedStatuses[idx] = "applied"; });
        setFileApplyStatuses(appliedStatuses);
      }, 600);

      // Close after a brief delay so user sees the "applied" state
      setTimeout(() => onClose(), 1000);
    }
  }, [latestFileActions, onApplyFileChanges, onClose]);

  const handleAcceptFile = useCallback(
    (idx: number, fileAction: LCFileActionResult) => {
      setFileApplyStatuses(prev => ({ ...prev, [idx]: "applying" }));

      // Defensively copy primitives — do NOT rely on spread which could
      // carry over unexpected properties from a mutated source object.
      const action: LCFileActionResult = {
        FileName: fileAction.FileName,
        ExistingFile: fileAction.ExistingFile,
        FileDirectory: fileAction.FileDirectory,
        Description: fileAction.Description,
        Content: fileAction.Content,
        Edits: fileAction.Edits,
        applyStatus: "applied",
      };
      onApplyFileChanges([action]);

      setTimeout(() => {
        setFileApplyStatuses(prev => ({ ...prev, [idx]: "applied" }));
      }, 500);
    },
    [onApplyFileChanges],
  );

  const handleToggleExpandAll = useCallback(() => {
    setViewAllExpanded((prev) => !prev);
    setViewAllToggleKey((k) => k + 1);
  }, []);

  const handlePreviewDiff = useCallback(
    (file: LCFileActionResult) => {
      if (onPreviewDiff) onPreviewDiff(file);
      onClose();
    },
    [onPreviewDiff, onClose],
  );

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Container className="bg-[#1e1e1e] border border-[#333] max-w-5xl w-[92vw]">
        <Modal.Dialog className="sm:max-w-[92vw] bg-[#1e1e1e] text-white min-h-[80vh]">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading className="text-white flex items-center gap-2 text-sm">
              <ListTree className="w-4 h-4 text-[#61afef]" />
              All AI Changes
              {latestFileActions && (
                <span className="text-[10px] text-[#858585] bg-[#3c3c3c] px-1.5 py-0.5 rounded-full ml-1">
                  {latestFileActions.length} file{latestFileActions.length !== 1 ? "s" : ""}
                </span>
              )}
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body className="min-h-[60vh] max-h-[70vh] overflow-y-auto">
            {latestFileActions && latestFileActions.length > 0 ? (
              <div className="space-y-3">
                {/* Summary bar */}
                <div className="flex items-center justify-between bg-[#252526] rounded-md px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#858585]">
                      <span className="text-[#98c379]">
                        {latestFileActions.filter((f) => !f.ExistingFile).length} new
                      </span>
                      <span className="mx-1.5">·</span>
                      <span className="text-[#e5c07b]">
                        {latestFileActions.filter((f) => f.ExistingFile).length} updates
                      </span>
                    </span>
                    {/* Collapse All / Expand All toggle */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-6 text-[#858585] hover:text-white border-0"
                      onPress={handleToggleExpandAll}
                    >
                      <ChevronsUpDown className="w-3 h-3" />
                      {viewAllExpanded ? "Collapse All" : "Expand All"}
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    className="text-xs h-7 bg-[#98c379] text-[#1e1e1e] hover:bg-[#7daf5e]"
                    onPress={handleAcceptAll}
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    Accept All Changes
                  </Button>
                </div>

                {/* File list — each file shown with collapsed diff sections */}
                {latestFileActions.map((file, idx) => {
                  const diffKey = `all:${idx}`;
                  const diffState = viewAllDiffs[diffKey];

                  return (
                    <div
                      key={idx}
                      className="border border-[#333333] rounded-md overflow-hidden"
                    >
                      {/* File header (always visible) */}
                      <div className="flex items-center justify-between px-3 py-2 bg-[#252526] border-b border-[#333333]">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <FileCode className="w-3.5 h-3.5 text-[#e5c07b] shrink-0" />
                          <span className="text-xs text-[#d4d4d4] font-medium truncate">
                            {getFilePath(file)}
                          </span>
                          <Chip
                            size="sm"
                            variant="soft"
                            className={`text-[10px] h-5 ${
                              file.ExistingFile
                                ? "bg-[#e5c07b]/10 text-[#e5c07b]"
                                : "bg-[#98c379]/10 text-[#98c379]"
                            }`}
                          >
                            {file.ExistingFile ? "Update" : "New"}
                          </Chip>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-6 text-[#61afef] hover:bg-[#61afef]/10"
                            onPress={() => handlePreviewDiff(file)}
                          >
                            <ArrowLeftRight className="w-3 h-3" />
                            Full Diff
                          </Button>
                          {fileApplyStatuses[idx] === "applied" ? (
                            <Chip
                              size="sm"
                              variant="soft"
                              className="text-[10px] h-5 bg-[#98c379]/20 text-[#98c379]"
                            >
                              <CheckCheck className="w-2.5 h-2.5 inline mr-0.5" />
                              Applied
                            </Chip>
                          ) : fileApplyStatuses[idx] === "applying" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              isDisabled
                              className="text-xs h-6 text-[#e5c07b] hover:bg-[#e5c07b]/10"
                            >
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Applying...
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-6 text-[#98c379] hover:bg-[#98c379]/10"
                              onPress={() => handleAcceptFile(idx, file)}
                            >
                              <Check className="w-3 h-3" />
                              Accept
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Diff content — with per-file scrolling for long diffs */}
                      {diffState === "loading" && (
                        <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-[#858585] bg-[#1e1e1e]">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Loading diff...
                        </div>
                      )}
                      {diffState !== null && diffState !== "loading" && (
                        <div className="bg-[#1e1e1e] max-h-[500px] overflow-y-auto">
                          {(() => {
                            const hasEdits = Array.isArray(file.Edits) && file.Edits.length > 0;
                            let modified = file.Content ?? "";
                            let showWarning = false;

                            if (!modified && hasEdits && diffState) {
                              try {
                                modified = applySearchReplace(diffState, file.Edits!).content;
                              } catch {
                                showWarning = true;
                                const replaceBlocks = file.Edits!.map((e, i) => {
                                  const desc = e.Description || `Edit ${i + 1}`;
                                  return `// === AI: ${desc} ===\n${e.Replace}`;
                                }).join("\n\n");

                                modified = [
                                  "// ═══════════════════════════════════════════════════════════",
                                  `// ⚠ SEARCH/REPLACE could not match the current file content.`,
                                  `// Below are the AI's intended replacements as a raw preview.`,
                                  "// ═══════════════════════════════════════════════════════════",
                                  "",
                                  replaceBlocks,
                                ].join("\n");
                              }
                            }

                            return (
                              <>
                                {showWarning && (
                                  <div className="px-3 py-1.5 text-[10px] text-[#e06c75] bg-[#e06c75]/5 border-b border-[#e06c75]/20">
                                    ⚠ SEARCH/REPLACE couldn't preview — showing AI's Replace blocks as a raw preview. Verify and apply manually.
                                  </div>
                                )}
                                <LCDiffDisplay
                                  key={`${viewAllToggleKey}-${idx}`}
                                  original={diffState}
                                  modified={modified}
                                  fileName={getFilePath(file)}
                                  isExisting={file.ExistingFile}
                                  defaultCollapsed={!viewAllExpanded}
                                />
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <FileCode className="w-12 h-12 text-[#333333] mb-4" />
                <p className="text-sm text-[#858585]">No changes to review</p>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button
              slot="close"
              variant="ghost"
              className="bg-transparent text-gray-300 hover:bg-[#333] text-xs"
            >
              Close
            </Button>
            {latestFileActions && latestFileActions.length > 0 && (
              <Button
                slot="close"
                onPress={handleAcceptAll}
                className="bg-[#98c379] text-black hover:bg-[#7daf5e] text-xs"
              >
                <GitMerge className="w-3.5 h-3.5" />
                Accept All Changes
              </Button>
            )}
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
