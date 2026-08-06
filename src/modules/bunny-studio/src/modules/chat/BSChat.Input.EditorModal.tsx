// BSChat.Input.EditorModal — Presentational CodeMirror editor modal.
//
// "Open in modal" from the chat input, with a cover/window view toggle
// (feature: Code Editor Open Modal).

"use client";

import React from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { BSCodeMirrorEditor, BSModal } from "../../components";

// ─── Props ─────────────────────────────────────────────────────────────

export interface BSChatInputEditorModalProps {
  /** Whether the modal is visible */
  open: boolean;
  /** Cover view (true) vs window view (false) */
  coverView: boolean;
  /** Current editor document */
  value: string;
  /** Called when the editor content changes */
  onValueChange: (value: string) => void;
  /** Closes the modal */
  onClose: () => void;
  /** Toggles cover/window view */
  onToggleCoverView: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────

export function BSChatInputEditorModal({
  open,
  coverView,
  value,
  onValueChange,
  onClose,
  onToggleCoverView,
}: BSChatInputEditorModalProps) {
  return (
    <BSModal
      open={open}
      onClose={onClose}
      title="Code Editor"
      sizeClassName="max-w-3xl h-[70vh]"
      fullscreen={coverView}
      onFullscreenChange={onToggleCoverView}
      footer={
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Editing in a separate window
          </span>
          <button
            onClick={onToggleCoverView}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition"
          >
            {coverView ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" /> Window View
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" /> Cover View
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="h-full">
        <BSCodeMirrorEditor
          value={value}
          onChange={onValueChange}
          height="100%"
          className="rounded-none"
        />
      </div>
    </BSModal>
  );
}

export default BSChatInputEditorModal;
