// BSVideoPreviewModal — Full-screen video player for a generated video.
//
// Opens a dark, full-viewport overlay showing the video with native controls,
// plus a Download button, an optional Delete (via `onDeleteRequest`), and close
// (X button or Escape). Used by the shared BSVideoCard so both the generator
// results and the Video Library get the same player experience.

"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Download, Loader2, Trash2 } from "lucide-react";
import type { BSVideoAsset } from "./BSVideoGenerator.Types";
import { downloadDataUrl, formatDuration } from "./BSVideoCard";

// ─── Component ──────────────────────────────────────────────────────────

export interface BSVideoPreviewModalProps {
  asset: BSVideoAsset;
  onClose: () => void;
  /** When provided, a Delete button is shown in the header bar. */
  onDeleteRequest?: () => void;
}

export function BSVideoPreviewModal({
  asset,
  onClose,
  onDeleteRequest,
}: BSVideoPreviewModalProps) {
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
    downloadDataUrl(asset.url, `bunny-ai-${asset.id.slice(0, 8)}.mp4`);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Video preview"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 text-white shrink-0">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{asset.prompt}</p>
          <p className="text-[11px] text-white/50 truncate">
            {asset.model.split("/").pop()} · {asset.size}
            {formatDuration(asset.duration) &&
              ` · ${formatDuration(asset.duration)}`}{" "}
            · {new Date(asset.createdDate).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDownload}
            title="Download video"
            className="flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-3 py-1.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          {onDeleteRequest && (
            <button
              type="button"
              onClick={onDeleteRequest}
              title="Delete video"
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
      <div className="relative flex-1 flex items-center justify-center p-4 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white/60 animate-spin" />
          </div>
        )}
        {/* Data-URL videos — native controls for play/pause/seek/fullscreen */}
        <video
          src={asset.url}
          controls
          autoPlay
          playsInline
          onLoadedData={() => setLoading(false)}
          className="max-w-full max-h-full rounded-xl shadow-2xl bg-black"
          style={{ width: "min(100%, 960px)" }}
        />
      </div>
    </div>,
    document.body,
  );
}

export default BSVideoPreviewModal;
