// BSSpeechPreviewModal — Full-screen audio player for a generated speech.
//
// Opens a dark, full-viewport overlay showing the audio with native controls,
// plus a Download button, an optional Delete (via `onDeleteRequest`), and close
// (X button or Escape). Used by the shared BSSpeechCard so both the generator
// results and the Speech Library get the same player experience.

"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Download, Loader2, Trash2 } from "lucide-react";
import type { BSSpeechAsset } from "./BSSpeechGenerator.Types";
import { downloadDataUrl, formatDuration } from "./BSSpeechCard";

// ─── Component ──────────────────────────────────────────────────────────

export interface BSSpeechPreviewModalProps {
  asset: BSSpeechAsset;
  onClose: () => void;
  /** When provided, a Delete button is shown in the header bar. */
  onDeleteRequest?: () => void;
}

export function BSSpeechPreviewModal({
  asset,
  onClose,
  onDeleteRequest,
}: BSSpeechPreviewModalProps) {
  const [loading, setLoading] = React.useState(true);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock body scroll while the player modal is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleDownload = () => {
    downloadDataUrl(asset.url, `bunny-ai-${asset.id.slice(0, 8)}.${asset.format}`);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Speech preview"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 text-white shrink-0">
        <div className="min-w-0">
          <p className="text-sm font-medium line-clamp-1">{asset.input}</p>
          <p className="text-[11px] text-white/50 truncate">
            {asset.model.split("/").pop()} · {asset.voice || "default voice"} ·{" "}
            {asset.format.toUpperCase()}
            {asset.sampleRate > 0 && ` · ${asset.sampleRate}Hz`}
            {formatDuration(asset.duration) &&
              ` · ${formatDuration(asset.duration)}`}{" "}
            · {new Date(asset.createdDate).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDownload}
            title="Download audio"
            className="flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-3 py-1.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          {onDeleteRequest && (
            <button
              type="button"
              onClick={onDeleteRequest}
              title="Delete audio"
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

      {/* Player */}
      <div className="relative flex-1 flex items-center justify-center p-6 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white/60 animate-spin" />
          </div>
        )}
        {/* Data-URL audio — native controls for play/pause/seek/volume */}
        <audio
          src={asset.url}
          controls
          autoPlay
          onLoadedData={() => setLoading(false)}
          onError={() => setLoading(false)}
          className="w-full"
          style={{ maxWidth: "640px" }}
        />
      </div>
    </div>,
    document.body,
  );
}

export default BSSpeechPreviewModal;
