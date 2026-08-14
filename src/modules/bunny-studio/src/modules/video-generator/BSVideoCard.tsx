// BSVideoCard — Reusable generated-video card with Play/Preview, Download (+ optional Delete).
//
// Shared by the Video Generator results grid and the Video Library grid so a
// freshly generated video and a library video behave identically:
//  - Preview — clicking the video (or the play overlay) opens the full-screen
//    player modal (BSVideoPreviewModal).
//  - Download — saves the data URL to disk as an MP4 (always available).
//  - Delete — removes from the library (only shown when an `onDeleted`
//    callback is provided, i.e. in the Library).

"use client";

import React, { useState } from "react";
import {
  Download,
  Trash2,
  Loader2,
  Check,
  Maximize2,
  Play,
  Clock,
} from "lucide-react";
import { bsDB } from "../../BSDatabase";
import { BSModal } from "../../components";
import { BSVideoPreviewModal } from "./BSVideoPreviewModal";
import type { BSVideoAsset } from "./BSVideoGenerator.Types";

// ─── Helpers ────────────────────────────────────────────────────────────

/** Trigger a browser download for a (data-URL) video. */
export function downloadDataUrl(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

/** Format a duration in seconds as "m:ss" (e.g. 7 → "0:07", 83 → "1:23"). */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// ─── Card ───────────────────────────────────────────────────────────────

export interface BSVideoCardProps {
  asset: BSVideoAsset;
  /** When provided, a Delete button is shown; fires after a successful delete. */
  onDeleted?: () => void;
  /**
   * When the action bar is visible:
   *  - "hover"  → revealed on hover (used in the Video Library grid).
   *  - "always" → always visible (used in the generator results).
   */
  reveal?: "hover" | "always";
}

export function BSVideoCard({
  asset,
  onDeleted,
  reveal = "hover",
}: BSVideoCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDownload = () => {
    downloadDataUrl(asset.url, `bunny-ai-${asset.id.slice(0, 8)}.mp4`);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 1500);
  };

  /** Open the BSModal delete confirmation (replaces the old window.confirm). */
  const handleDeleteRequest = () => {
    setDeleteError("");
    setConfirmOpen(true);
  };

  /** Actually remove the asset once the user confirms inside the modal. */
  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      await bsDB.videoLibraryRepo.delete(asset.id);
      setConfirmOpen(false);
      onDeleted?.();
    } catch (err) {
      console.error("[BSVideoCard] Failed to delete video:", err);
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete the video.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <figure className="bs-img-card group relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-lg transition-shadow">
        {/* Clickable video — opens the full-screen player modal */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setPreviewOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setPreviewOpen(true);
            }
          }}
          title="Preview video"
          className="relative aspect-video overflow-hidden bg-gray-100 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-red-400"
        >
          {/* Data-URL videos — native video element with metadata preload so the
              grid doesn't download the whole file up front. */}
          <video
            src={asset.url}
            preload="metadata"
            muted
            playsInline
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Center play overlay */}
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex items-center justify-center w-12 h-12 rounded-full bg-black/50 text-white backdrop-blur-sm group-hover:bg-red-600 transition-colors">
              <Play className="w-5 h-5 ml-0.5" />
            </span>
          </span>

          {/* Duration badge — top-left, always visible */}
          {formatDuration(asset.duration) && (
            <span className="absolute top-2 left-2 flex items-center gap-1 rounded-lg bg-black/60 backdrop-blur-sm text-white text-[11px] font-medium px-2 py-1">
              <Clock className="w-3 h-3" />
              {formatDuration(asset.duration)}
            </span>
          )}

          {/* Expand hint — top-right, visible on hover */}
          <span className="absolute top-2 right-2 flex items-center justify-center w-8 h-8 rounded-lg bg-black/50 text-white opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
            <Maximize2 className="w-4 h-4" />
          </span>

          {/* Action bar — download + (optional) delete. stopPropagation keeps
              these buttons from also opening the preview. */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute inset-x-0 bottom-0 flex items-center justify-end gap-2 p-2 bg-gradient-to-t from-black/60 to-transparent transition-all duration-200 ${
              reveal === "always"
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"
            }`}
          >
            <button
              type="button"
              onClick={handleDownload}
              title="Download video"
              className="flex items-center gap-1 rounded-lg bg-white/90 hover:bg-white text-gray-800 text-xs font-medium px-2.5 py-1.5 transition-colors"
            >
              {downloaded ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {downloaded ? "Saved" : "Download"}
            </button>
            {onDeleted && (
              <button
                type="button"
                onClick={handleDeleteRequest}
                disabled={deleting}
                title="Delete from library"
                className="flex items-center gap-1 rounded-lg bg-red-500/90 hover:bg-red-500 text-white text-xs font-medium px-2.5 py-1.5 transition-colors disabled:opacity-60"
              >
                {deleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Delete
              </button>
            )}
          </div>
        </div>

        <figcaption className="p-3">
          <p
            className="text-sm text-gray-800 line-clamp-2 min-h-[2.5rem]"
            title={asset.prompt}
          >
            {asset.prompt}
          </p>
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-gray-400">
            <span className="truncate">
              {asset.model.split("/").pop()} · {asset.size}
              {formatDuration(asset.duration) &&
                ` · ${formatDuration(asset.duration)}`}
            </span>
            <span className="shrink-0">{formatDate(asset.createdDate)}</span>
          </div>
        </figcaption>
      </figure>

      {previewOpen && (
        <BSVideoPreviewModal
          key={asset.id}
          asset={asset}
          onClose={() => setPreviewOpen(false)}
          onDeleteRequest={() => {
            setPreviewOpen(false);
            handleDeleteRequest();
          }}
        />
      )}

      {/* Delete confirmation — BSModal replaces the old window.confirm */}
      <BSModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete video"
        sizeClassName="max-w-sm"
        disableFullscreen
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              disabled={deleting}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-3 py-1.5 transition-colors disabled:opacity-60"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Delete
            </button>
          </div>
        }
      >
        <div className="p-5">
          <p className="text-sm text-gray-700">
            Are you sure you want to delete this video from the library? This
            action cannot be undone.
          </p>
          {deleteError && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              {deleteError}
            </p>
          )}
        </div>
      </BSModal>
    </>
  );
}
