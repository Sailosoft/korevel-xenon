// BSImageCard — Reusable generated-image card with Preview, Download (+ optional Delete).
//
// Shared by the Image Generator results grid and the Image Library grid so a
// freshly generated image and a library image behave identically:
//  - Preview — clicking the image (or the expand icon) opens the full-screen
//    cover modal with zoom in / zoom out / pan (BSImagePreviewModal).
//  - Download — saves the data URL to disk as a PNG (always available).
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
} from "lucide-react";
import { bsDB } from "../../BSDatabase";
import { BSModal } from "../../components";
import { BSImagePreviewModal } from "./BSImagePreviewModal";
import type { BSImageAsset } from "./BSImageGenerator.Types";

// ─── Helpers ────────────────────────────────────────────────────────────

/** Trigger a browser download for a (data-URL) image. */
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

// ─── Card ───────────────────────────────────────────────────────────────

export interface BSImageCardProps {
  asset: BSImageAsset;
  /** When provided, a Delete button is shown; fires after a successful delete. */
  onDeleted?: () => void;
  /**
   * When the action bar is visible:
   *  - "hover"  → revealed on hover (used in the Image Library grid).
   *  - "always" → always visible (used in the generator results).
   */
  reveal?: "hover" | "always";
}

export function BSImageCard({
  asset,
  onDeleted,
  reveal = "hover",
}: BSImageCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDownload = () => {
    downloadDataUrl(asset.url, `bunny-ai-${asset.id.slice(0, 8)}.png`);
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
      await bsDB.imageLibraryRepo.delete(asset.id);
      setConfirmOpen(false);
      onDeleted?.();
    } catch (err) {
      console.error("[BSImageCard] Failed to delete image:", err);
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete the image.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <figure className="bs-img-card group relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-lg transition-shadow">
        {/* Clickable image — opens the full-screen preview modal */}
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
          title="Preview image"
          className="relative aspect-square overflow-hidden bg-gray-100 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-red-400"
        >
          {/* Data-URL images — next/image can't optimize these */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset.url}
            alt={asset.prompt}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

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
              title="Download image"
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
            </span>
            <span className="shrink-0">{formatDate(asset.createdDate)}</span>
          </div>
        </figcaption>
      </figure>

      {previewOpen && (
        <BSImagePreviewModal
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
        title="Delete image"
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
            Are you sure you want to delete this image from the library? This
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
