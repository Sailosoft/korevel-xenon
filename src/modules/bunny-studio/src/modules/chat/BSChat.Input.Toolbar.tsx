// BSChat.Input.Toolbar — Presentational bottom toolbar of the chat input.
//
// Renders (left to right): the input mode selector (Standard / Instruction /
// Code), the per-request render type selector, the "Open in Modal" code
// editor button, and the helper text. The send/stop button lives next to
// this toolbar in the parent component (feature: input toolbar at the bottom).

"use client";

import React from "react";
import { Code2, ExternalLink, SlidersHorizontal, Type } from "lucide-react";
import type { RenderFormat } from "@/src/modules/render";
import type { BSChatInputMode } from "./BSChat.Input.Hooks";

// ─── Constants ─────────────────────────────────────────────────────────

const MODE_ICONS: Record<BSChatInputMode, React.ReactNode> = {
  standard: <Type className="w-4 h-4" />,
  instruction: <SlidersHorizontal className="w-4 h-4" />,
  codemirror: <Code2 className="w-4 h-4" />,
};

const MODE_BUTTONS: Array<{ mode: BSChatInputMode; label: string }> = [
  { mode: "standard", label: "Standard" },
  { mode: "instruction", label: "Instruction" },
  { mode: "codemirror", label: "Code" },
];

// ─── Props ─────────────────────────────────────────────────────────────

export interface BSChatInputToolbarProps {
  /** Active input mode */
  mode: BSChatInputMode;
  /** Switches the input mode */
  onModeChange: (mode: BSChatInputMode) => void;
  /** Current render type shown in the per-request selector */
  renderType?: RenderFormat;
  /** Available render types for the per-request selector */
  renderTypes?: readonly RenderFormat[];
  /** Called when the user changes the per-request render type */
  onRenderTypeChange?: (format: RenderFormat | undefined) => void;
  /** True while a stream is in progress — disables the render selector */
  isStreaming: boolean;
  /** Opens the code editor in a modal (codemirror mode only) */
  onOpenEditorModal: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────

export function BSChatInputToolbar({
  mode,
  onModeChange,
  renderType,
  renderTypes,
  onRenderTypeChange,
  isStreaming,
  onOpenEditorModal,
}: BSChatInputToolbarProps) {
  return (
    <div className="flex items-center gap-2 min-w-0 w-full flex-wrap sm:flex-nowrap">
      {/* Mode selector — icon-only; label shown as a tooltip */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 shrink-0">
        {MODE_BUTTONS.map((b) => (
          <button
            key={b.mode}
            onClick={() => onModeChange(b.mode)}
            title={b.label}
            aria-label={b.label}
            className={`flex items-center justify-center p-1.5 rounded-lg transition ${
              mode === b.mode
                ? "bg-white shadow text-red-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {MODE_ICONS[b.mode]}
          </button>
        ))}
      </div>

      {/* Per-request render type selector (feature) */}
      {renderTypes && renderTypes.length > 0 && (
        <select
          value={renderType ?? ""}
          onChange={(e) =>
            onRenderTypeChange?.(
              e.target.value ? (e.target.value as RenderFormat) : undefined,
            )
          }
          disabled={isStreaming}
          title="Render type for the next message"
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-[11px] text-gray-500 outline-none focus:border-red-300 disabled:opacity-50 min-w-[120px] max-w-full sm:max-w-[140px] flex-1 sm:flex-none"
        >
          <option value="">No render</option>
          {renderTypes.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      )}

      {/* Open the code editor in a modal (feature) — icon-only on mobile */}
      {mode === "codemirror" && !isStreaming && (
        <button
          onClick={onOpenEditorModal}
          title="Open code editor in a modal"
          aria-label="Open code editor in a modal"
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-[11px] text-gray-500 hover:border-red-300 hover:text-red-600 transition shrink-0"
        >
          <ExternalLink className="w-3 h-3" />
          <span className="hidden sm:inline">Open in Modal</span>
        </button>
      )}

      {/* Keyboard hint — desktop only to keep the row compact on mobile */}
      <span className="hidden sm:inline text-[10px] text-gray-400 truncate">
        {isStreaming
          ? "Generating…"
          : "Enter to send · Shift+Enter for new line"}
      </span>
    </div>
  );
}

export default BSChatInputToolbar;
