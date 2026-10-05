// BSImagePreviewModal — Full-screen "cover" preview for a generated image.
//
// Opens a dark, full-viewport overlay showing the image large and centered,
// with:
//  - Zoom in / zoom out / reset controls (buttons, mouse wheel at the cursor,
//    double-click to toggle 1x / 2x).
//  - Drag-to-pan while zoomed in.
//  - Download shortcut, optional Delete (via `onDeleteRequest`), and close
//    (X button or Escape).
//
// Used by the shared BSImageCard, so both the generator results and the Image
// Library get the same preview experience.

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Loader2,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { BSImageAsset } from "./BSImageGenerator.Types";
import { buildImageDownloadName, downloadDataUrl } from "./BSImageCard";

const MIN_SCALE = 1;
const MAX_SCALE = 5;

interface DragState {
  startX: number;
  startY: number;
  tx: number;
  ty: number;
}

// ─── Component ──────────────────────────────────────────────────────────

export interface BSImagePreviewModalProps {
  asset: BSImageAsset;
  onClose: () => void;
  /** When provided, a Delete button is shown in the header bar. */
  onDeleteRequest?: () => void;
  /** When provided, a left arrow is shown to navigate to the previous image. */
  onPrev?: () => void;
  /** When provided, a right arrow is shown to navigate to the next image. */
  onNext?: () => void;
  /** Optional 1-based position within the collection (e.g. 3 of 12). */
  position?: { index: number; total: number };
}

export function BSImagePreviewModal({
  asset,
  onClose,
  onDeleteRequest,
  onPrev,
  onNext,
  position,
}: BSImagePreviewModalProps) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  const clamp = (v: number, min: number, max: number) =>
    Math.min(Math.max(v, min), max);

  // Close on Escape; navigate with the arrow keys when available.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && onPrev) {
        onPrev();
      } else if (e.key === "ArrowRight" && onNext) {
        onNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  // Lock body scroll while the cover modal is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Note: the view is reset per image by keying this modal with the asset id
  // at the call site (each open mounts a fresh instance at 100%).

  // Zoom so the point under the cursor stays stationary.
  const zoomAt = useCallback(
    (clientX: number, clientY: number, nextScale: number) => {
      const el = viewportRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const target = clamp(nextScale, MIN_SCALE, MAX_SCALE);
      if (target === scale) return;
      const ratio = target / scale;
      setTx(clientX - cx - (clientX - cx - tx) * ratio);
      setTy(clientY - cy - (clientY - cy - ty) * ratio);
      setScale(target);
    },
    [scale, tx, ty],
  );

  const zoomAtCenter = useCallback(
    (nextScale: number) => {
      const el = viewportRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, nextScale);
    },
    [zoomAt],
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      zoomAt(e.clientX, e.clientY, scale * factor);
    },
    [scale, zoomAt],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (scale <= 1) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ startX: e.clientX, startY: e.clientY, tx, ty });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    setTx(drag.tx + (e.clientX - drag.startX));
    setTy(drag.ty + (e.clientY - drag.startY));
  };

  const handlePointerUp = () => setDrag(null);

  // Double-click toggles 1x / 2x.
  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    zoomAt(e.clientX, e.clientY, scale > 1 ? 1 : 2);
  };

  const reset = () => {
    setScale(1);
    setTx(0);
    setTy(0);
  };

  const handleDownload = () => {
    downloadDataUrl(asset.url, buildImageDownloadName(asset));
  };

  const zoomed = scale > 1;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 text-white shrink-0">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{asset.prompt}</p>
          <p className="text-[11px] text-white/50 truncate">
            {asset.model.split("/").pop()} · {asset.size} ·{" "}
            {new Date(asset.createdDate).toLocaleString()}
            {position && (
              <span className="ml-2 text-white/70 tabular-nums">
                {position.index} / {position.total}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDownload}
            title="Download image"
            className="flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-3 py-1.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          {onDeleteRequest && (
            <button
              type="button"
              onClick={onDeleteRequest}
              title="Delete image"
              className="flex items-center gap-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white text-xs font-medium px-3 py-1.5 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            className="flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white w-8 h-8 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Viewport */}
      <div
        ref={viewportRef}
        className="relative flex-1 overflow-hidden touch-none select-none"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        style={{ cursor: zoomed ? (drag ? "grabbing" : "grab") : "zoom-in" }}
      >
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white/60 animate-spin" />
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset.url}
          alt={asset.prompt}
          draggable={false}
          onLoad={() => setLoaded(true)}
          className="pointer-events-none absolute left-1/2 top-1/2 max-w-[92%] max-h-[92%] object-contain"
          style={{
            transform: `translate(-50%, -50%) translate(${tx}px, ${ty}px) scale(${scale})`,
            transition: drag
              ? "none"
              : "transform 0.15s ease-out",
            opacity: loaded ? 1 : 0,
          }}
        />
      </div>

      {/* Previous / next navigation (gallery-style, wraps at the ends) */}
      {onPrev && (
        <button
          type="button"
          onClick={onPrev}
          title="Previous image (←)"
          aria-label="Previous image"
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-11 h-11 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      {onNext && (
        <button
          type="button"
          onClick={onNext}
          title="Next image (→)"
          aria-label="Next image"
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-11 h-11 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Zoom controls */}
      <div className="flex items-center justify-center gap-2 py-3 shrink-0">
        <button
          type="button"
          onClick={() => zoomAtCenter(scale / 1.25)}
          disabled={scale <= MIN_SCALE}
          title="Zoom out"
          className="flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white w-9 h-9 transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-white/70 text-xs w-14 text-center tabular-nums">
          {Math.round(scale * 100)}%
        </span>
        <button
          type="button"
          onClick={reset}
          title="Reset zoom"
          className="flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white w-9 h-9 transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => zoomAtCenter(scale * 1.25)}
          disabled={scale >= MAX_SCALE}
          title="Zoom in"
          className="flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white w-9 h-9 transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>
    </div>,
    document.body,
  );
}

export default BSImagePreviewModal;
