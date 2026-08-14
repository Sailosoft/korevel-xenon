// BSTranscriptionCard — Reusable transcription card with re-listen + Download
// (+ optional Delete).
//
// Shared by the Transcription results and the Transcription Library so a freshly
// transcribed audio and a library transcript behave identically:
//  - Re-listen — an inline <audio> player plays the stored source audio (when
//    it was persisted).
//  - Download — saves the transcript to a .txt file.
//  - Delete — removes from the library (only shown when an `onDeleted`
//    callback is provided, i.e. in the Library).

"use client";

import React, { useState } from "react";
import {
  Trash2,
  Loader2,
  Check,
  FileText,
  AudioLines,
  Clock,
} from "lucide-react";
import { bsDB } from "../../BSDatabase";
import { BSModal } from "../../components";
import type { BSTranscriptionAsset } from "./BSTranscription.Types";

// ─── Helpers ────────────────────────────────────────────────────────────

/** Trigger a browser download for a plain-text transcript. */
export function downloadText(text: string, filename: string) {
  const a = document.createElement("a");
  a.href = `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
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

export interface BSTranscriptionCardProps {
  asset: BSTranscriptionAsset;
  /** When provided, a Delete button is shown; fires after a successful delete. */
  onDeleted?: () => void;
}

export function BSTranscriptionCard({
  asset,
  onDeleted,
}: BSTranscriptionCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDownload = () => {
    downloadText(
      asset.text,
      `transcript-${asset.id.slice(0, 8)}.txt`,
    );
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
      await bsDB.transcriptionLibraryRepo.delete(asset.id);
      setConfirmOpen(false);
      onDeleted?.();
    } catch (err) {
      console.error("[BSTranscriptionCard] Failed to delete transcription:", err);
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete the transcript.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <figure className="bs-img-card group relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-lg transition-shadow">
        {/* Header — file name + model/date meta */}
        <div className="flex items-center gap-3 px-4 pt-4">
          <div className="bs-bunny-face bs-beat w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0">
            <AudioLines className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-800 truncate">
              {asset.fileName}
            </p>
            <p className="text-[11px] text-gray-400 truncate">
              {asset.model.split("/").pop()}
              {asset.language && ` · ${asset.language}`}
              {formatDuration(asset.duration) &&
                ` · ${formatDuration(asset.duration)}`}
            </p>
          </div>
        </div>

        {/* Inline re-listen player (source audio, when persisted) */}
        {asset.url && (
          <div className="px-4 py-3">
            <audio
              src={asset.url}
              controls
              preload="metadata"
              className="w-full h-10"
            />
          </div>
        )}

        {/* Transcript text */}
        <figcaption className="px-4 pb-3">
          <p
            className="text-sm text-gray-800 line-clamp-4 min-h-[4rem] whitespace-pre-wrap"
            title={asset.text}
          >
            {asset.text || "(empty transcript)"}
          </p>
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-gray-400">
            <span className="flex items-center gap-1 truncate">
              <Clock className="w-3 h-3 shrink-0" />
              {formatDate(asset.createdDate)}
            </span>
            <span className="shrink-0 truncate">
              {asset.text.split(/\s+/).filter(Boolean).length} words
            </span>
          </div>
        </figcaption>

        {/* Action bar — download + (optional) delete */}
        <div className="flex items-center justify-end gap-2 px-4 pb-4">
          <button
            type="button"
            onClick={handleDownload}
            title="Download transcript (.txt)"
            className="flex items-center gap-1 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium px-2.5 py-1.5 transition-colors"
          >
            {downloaded ? (
              <Check className="w-3.5 h-3.5 text-green-600" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
            {downloaded ? "Saved" : ".txt"}
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

      {/* Delete confirmation — BSModal replaces the old window.confirm */}
      <BSModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete transcript"
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
            Are you sure you want to delete this transcript from the library?
            This action cannot be undone.
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
