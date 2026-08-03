// BSModal — Reusable modal dialog for Bunny AI Studio.
//
// A lightweight, dependency-free modal with:
//  - Backdrop click + Escape to close.
//  - Optional fullscreen / window-size toggle (feature: "open in editor").
//  - Header (title + window/fullscreen + close), scrollable body, optional footer.

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { X, Maximize2, Minimize2 } from "lucide-react";

// ─── Props ─────────────────────────────────────────────────────────────

export interface BSModalProps {
  /** Whether the modal is visible */
  open: boolean;
  /** Called when the user requests to close the modal */
  onClose: () => void;
  /** Header title (string or node) */
  title?: React.ReactNode;
  /** Modal body */
  children: React.ReactNode;
  /** Optional footer bar */
  footer?: React.ReactNode;
  /** Tailwind class for the non-fullscreen window size (default: max-w-2xl) */
  sizeClassName?: string;
  /** Start in fullscreen mode */
  defaultFullscreen?: boolean;
  /** Controlled fullscreen value (feature: open in cover/window view) */
  fullscreen?: boolean;
  /** Called when the controlled fullscreen value should change */
  onFullscreenChange?: (value: boolean) => void;
  /** Allow closing when the backdrop is clicked (default true) */
  closeOnBackdrop?: boolean;
  /** When true the maximize button is hidden (modal is forced to its size) */
  disableFullscreen?: boolean;
}

// ─── Component ─────────────────────────────────────────────────────────

export function BSModal({
  open,
  onClose,
  title,
  children,
  footer,
  sizeClassName = "max-w-2xl",
  defaultFullscreen = false,
  fullscreen: controlledFullscreen,
  onFullscreenChange,
  closeOnBackdrop = true,
  disableFullscreen = false,
}: BSModalProps) {
  const isControlled = controlledFullscreen !== undefined;
  const [internalFullscreen, setInternalFullscreen] = useState(defaultFullscreen);
  // Track the last-seen open state so we reset the size on each open via
  // render-time adjustment (avoids cascading renders from an effect).
  const [prevOpen, setPrevOpen] = useState(open);

  const fullscreen = isControlled
    ? controlledFullscreen
    : internalFullscreen;

  const setFullscreen = useCallback(
    (value: boolean) => {
      if (isControlled) {
        onFullscreenChange?.(value);
      } else {
        setInternalFullscreen(value);
      }
    },
    [isControlled, onFullscreenChange],
  );

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open && !isControlled) setInternalFullscreen(defaultFullscreen);
  }

  // Escape closes the window first, then the modal.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (fullscreen) {
        setFullscreen(false);
      } else {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, fullscreen, onClose, setFullscreen]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative bg-white shadow-2xl flex flex-col overflow-hidden ${
          fullscreen
            ? "w-full h-full rounded-none sm:rounded-none"
            : `${sizeClassName} w-full max-h-[88vh] rounded-3xl`
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 h-12 border-b border-gray-200 shrink-0">
          <div className="text-sm font-semibold text-gray-800 truncate">
            {title}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!disableFullscreen && (
              <button
                onClick={() => setFullscreen(!fullscreen)}
                title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition"
              >
                {fullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
            )}
            <button
              onClick={onClose}
              title="Close"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-auto bg-gray-50">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-4 py-3 border-t border-gray-200 bg-white shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default BSModal;
