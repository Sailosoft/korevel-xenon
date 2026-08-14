// BSSpeechCard — Reusable generated-speech card with inline listen + Preview,
// Download (+ optional Delete).
//
// Shared by the Speech Generator results grid and the Speech Library grid so a
// freshly generated audio and a library audio behave identically:
//  - Listen — an inline <audio> player plays the audio right on the card.
//  - Preview — clicking the header row opens the full-screen player modal
//    (BSSpeechPreviewModal).
//  - Download — saves the data URL to disk with the correct extension.
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
  AudioLines,
  Clock,
} from "lucide-react";
import { bsDB } from "../../BSDatabase";
import { BSModal } from "../../components";
import { BSSpeechPreviewModal } from "./BSSpeechPreviewModal";
import type { BSSpeechAsset } from "./BSSpeechGenerator.Types";

// ─── Helpers ────────────────────────────────────────────────────────────

/** Trigger a browser download for a (data-URL) audio. */
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

export interface BSSpeechCardProps {
  asset: BSSpeechAsset;
  /** When provided, a Delete button is shown; fires after a successful delete. */
  onDeleted?: () => void;
}

export function BSSpeechCard({ asset, onDeleted }: BSSpeechCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDownload = () => {
    downloadDataUrl(asset.url, `bunny-ai-${asset.id.slice(0, 8)}.${asset.format}`);
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
      await bsDB.speechLibraryRepo.delete(asset.id);
      setConfirmOpen(false);
      onDeleted?.();
    } catch (err) {
      console.error("[BSSpeechCard] Failed to delete speech:", err);
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete the audio.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <figure className="bs-img-card group relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-lg transition-shadow">
        {/* Header row — clickable → full-screen player modal */}
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
          title="Preview audio"
          className="flex items-center gap-3 px-4 pt-4 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-red-400"
        >
          <div className="bs-bunny-face bs-beat w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0">
            <AudioLines className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-800 truncate">
              {asset.model.split("/").pop()}
            </p>
            <p className="text-[11px] text-gray-400 truncate">
              {asset.voice || "Default voice"} · {asset.format.toUpperCase()}
              {asset.sampleRate > 0 && ` · ${asset.sampleRate}Hz`}
            </p>
          </div>
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-500 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
            <Maximize2 className="w-4 h-4" />
          </span>
        </div>

        {/* Inline audio player — listen right on the card */}
        <div className="px-4 py-3">
          <audio
            src={asset.url}
            controls
            preload="metadata"
            className="w-full h-10"
          />
        </div>

        {/* Input text */}
        <figcaption className="px-4 pb-3">
          <p
            className="text-sm text-gray-800 line-clamp-2 min-h-[2.5rem]"
            title={asset.input}
          >
            {asset.input}
          </p>
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-gray-400">
            <span className="flex items-center gap-1 truncate">
              {formatDuration(asset.duration) && (
                <>
                  <Clock className="w-3 h-3 shrink-0" />
                  {formatDuration(asset.duration)}
                </>
              )}
              <span className="truncate">
                {asset.model.split("/").pop()}
              </span>
            </span>
            <span className="shrink-0">{formatDate(asset.createdDate)}</span>
          </div>
        </figcaption>

        {/* Action bar — download + (optional) delete */}
        <div className="flex items-center justify-end gap-2 px-4 pb-4">
          <button
            type="button"
            onClick={handleDownload}
            title="Download audio"
            className="flex items-center gap-1 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium px-2.5 py-1.5 transition-colors"
          >
            {downloaded ? (
              <Check className="w-3.5 h-3.5 text-green-600" />
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
              className="flex items-center gap-1 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-medium px-2.5 py-1.5 transition-colors disabled:opacity-60"
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
      </figure>

      {previewOpen && (
        <BSSpeechPreviewModal
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
        title="Delete audio"
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
            Are you sure you want to delete this audio from the library? This
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
