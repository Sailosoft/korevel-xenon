// BSImageLibrary.Component — The AI Image Library grid.
//
// Displays every image produced by the Image Generator (persisted to the local
// `imageLibrary` IndexedDB table), newest first, using the shared BSImageCard
// which provides Download + Delete on each image.
//
// Full-library features:
//  - Day grouping — images are grouped by their local generation day, with
//    "Today" / "Yesterday" / a long date header per group. Selecting a day's
//    checkbox selects/clears every image in that group.
//  - Multi-select + bulk delete — an explicit "Select" toggle enables selection
//    mode; a sticky toolbar deletes all selected images in one operation.
//  - Gallery preview — clicking a card opens one shared preview modal that can
//    navigate previous/next (wrapping) across the whole ordered library.
//
// The generator's compact preview (limit prop) stays a flat, non-selectable
// grid; grouping/selection only apply to the full library.
//
// Deliberately does NOT use useLiveQuery — it loads on mount and whenever the
// `refreshKey` prop changes, so the generator can bump the key right after a
// successful generation and the grid updates deterministically. Images are
// stored as base64 data URLs, so nothing re-hits the provider to view,
// download, or re-render the gallery.

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Images,
  ImageOff,
  AlertCircle,
  ListChecks,
  Trash2,
  Loader2,
} from "lucide-react";
import { bsDB } from "../../BSDatabase";
import { BSModal } from "../../components";
import { BSImageCard } from "./BSImageCard";
import { BSImagePreviewModal } from "./BSImagePreviewModal";
import type { BSImageAsset } from "./BSImageGenerator.Types";

// ─── Day grouping helpers ───────────────────────────────────────────────

interface DayGroup {
  key: string;
  label: string;
  images: BSImageAsset[];
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  const now = new Date();
  if (isSameDay(d, now)) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Group newest-first images into consecutive local-day buckets. */
function groupByDay(images: BSImageAsset[]): DayGroup[] {
  const groups: DayGroup[] = [];
  const byKey = new Map<string, DayGroup>();
  for (const image of images) {
    const key = dayKey(image.createdDate);
    let group = byKey.get(key);
    if (!group) {
      group = { key, label: dayLabel(image.createdDate), images: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.images.push(image);
  }
  return groups;
}

// ─── Component ──────────────────────────────────────────────────────────

export interface BSImageLibraryProps {
  /** Optional extra classes for the grid wrapper */
  className?: string;
  /** Optional heading above the grid (default: "Image Library") */
  title?: string;
  /** Show the heading + count summary (default: true) */
  showHeader?: boolean;
  /** Bump this number to force a reload (e.g. after generating a new image). */
  refreshKey?: number;
  /** Only render the newest N images. Used by the generator's compact preview. */
  limit?: number;
}

export function BSImageLibrary({
  className = "",
  title = "Image Library",
  showHeader = true,
  refreshKey = 0,
  limit,
}: BSImageLibraryProps) {
  const [images, setImages] = useState<BSImageAsset[] | null>(null);
  const [error, setError] = useState("");

  // Multi-select state (full library only).
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Shared gallery preview state.
  const [previewId, setPreviewId] = useState<string | null>(null);

  // Delete confirmation (single from preview, or bulk from selection).
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const load = useCallback(async () => {
    try {
      const rows = await bsDB.imageLibrary.toArray();
      setImages(
        [...rows].sort((a, b) =>
          b.createdDate.localeCompare(a.createdDate),
        ),
      );
      setError("");
    } catch (err) {
      console.error("[BSImageLibrary] Failed to read the image library:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load the image library.",
      );
      setImages([]);
    }
    // Any reload invalidates selection + preview references.
    setSelectedIds(new Set());
    setPreviewId(null);
  }, []);

  // Load on mount and whenever the generator signals a new image was saved.
  // setState happens after `await` inside load(), never synchronously.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load, refreshKey]);

  const handleDeleted = useCallback(() => {
    void load();
  }, [load]);

  const loading = images === null;
  const libraryImages = useMemo(() => images ?? [], [images]);
  // Newest-first already sorted in `load`; slice the last `limit` for the
  // generator's compact preview. The header count still reflects the full
  // library size.
  const visibleImages = limit ? libraryImages.slice(0, limit) : libraryImages;
  const groups = useMemo(
    () => (limit ? [] : groupByDay(libraryImages)),
    [libraryImages, limit],
  );

  // ── Selection ─────────────────────────────────────────────────────────
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setManySelected = useCallback((ids: string[], value: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (value) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const allSelected =
    libraryImages.length > 0 &&
    libraryImages.every((img) => selectedIds.has(img.id));

  // ── Preview navigation (wraps) ─────────────────────────────────────────
  const previewIndex = previewId
    ? visibleImages.findIndex((a) => a.id === previewId)
    : -1;
  const previewAsset = previewIndex >= 0 ? visibleImages[previewIndex] : null;
  const previewCount = visibleImages.length;

  const goPrev = () => {
    if (previewCount <= 1) return;
    setPreviewId((cur) => {
      if (!cur) return cur;
      const i = visibleImages.findIndex((a) => a.id === cur);
      if (i < 0) return cur;
      return visibleImages[(i - 1 + previewCount) % previewCount].id;
    });
  };

  const goNext = () => {
    if (previewCount <= 1) return;
    setPreviewId((cur) => {
      if (!cur) return cur;
      const i = visibleImages.findIndex((a) => a.id === cur);
      if (i < 0) return cur;
      return visibleImages[(i + 1) % previewCount].id;
    });
  };

  // ── Delete (single from preview / bulk from selection) ─────────────────
  const requestPreviewDelete = () => {
    if (!previewId) return;
    const target = previewId;
    setPreviewId(null);
    setDeleteError("");
    setDeleteIds([target]);
  };

  const requestBulkDelete = () => {
    setDeleteError("");
    setDeleteIds([...selectedIds]);
  };

  const confirmDelete = async () => {
    const ids = deleteIds ?? [];
    if (ids.length === 0) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await bsDB.imageLibraryRepo.deleteMany(ids);
      setDeleteIds(null);
      setSelectedIds(new Set());
      setSelectMode(false);
      await load();
    } catch (err) {
      console.error("[BSImageLibrary] Failed to delete images:", err);
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete the images.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const renderGrid = (items: BSImageAsset[]) => (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((asset) => (
        <BSImageCard
          key={asset.id}
          asset={asset}
          reveal="hover"
          onDeleted={handleDeleted}
          onPreview={() => setPreviewId(asset.id)}
          selectable={selectMode && !limit}
          selected={selectedIds.has(asset.id)}
          onToggleSelect={() => toggleSelect(asset.id)}
        />
      ))}
    </div>
  );

  return (
    <>
      <section className={className}>
        {showHeader && (
          <div className="mb-4 flex items-center gap-2">
            <Images className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            {!loading && (
              <span className="text-xs text-gray-400">
                ({libraryImages.length}{" "}
                {libraryImages.length === 1 ? "image" : "images"})
              </span>
            )}
            {!loading && libraryImages.length > 0 && !limit && (
              <div className="ml-auto flex items-center gap-2">
                {selectMode ? (
                  <button
                    type="button"
                    onClick={exitSelectMode}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectMode(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <ListChecks className="w-3.5 h-3.5" />
                    Select
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Sticky multi-select toolbar */}
        {selectMode && !limit && !loading && libraryImages.length > 0 && (
          <div className="sticky top-0 z-20 -mx-1 mb-4 flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) {
                    el.indeterminate = !allSelected && selectedIds.size > 0;
                  }
                }}
                onChange={(e) =>
                  setManySelected(
                    libraryImages.map((img) => img.id),
                    e.target.checked,
                  )
                }
                className="h-4 w-4 accent-red-600"
              />
              Select all
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {selectedIds.size} selected
              </span>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                disabled={selectedIds.size === 0}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={requestBulkDelete}
                disabled={selectedIds.size === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete selected
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-xl bg-gray-200 animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : libraryImages.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white/60 py-16 text-center">
            <ImageOff className="w-10 h-10 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-600">No images yet</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs">
              Generate your first image with the Image Generator and it will
              appear here.
            </p>
          </div>
        ) : limit ? (
          renderGrid(visibleImages)
        ) : (
          <div className="space-y-8">
            {groups.map((group) => {
              const ids = group.images.map((img) => img.id);
              const allDaySelected = ids.every((id) => selectedIds.has(id));
              const someDaySelected = ids.some((id) => selectedIds.has(id));
              return (
                <div key={group.key}>
                  <div className="mb-3 flex items-center gap-2">
                    {selectMode && (
                      <input
                        type="checkbox"
                        checked={allDaySelected}
                        ref={(el) => {
                          if (el) {
                            el.indeterminate =
                              !allDaySelected && someDaySelected;
                          }
                        }}
                        onChange={(e) =>
                          setManySelected(ids, e.target.checked)
                        }
                        aria-label={`Select all images from ${group.label}`}
                        className="h-4 w-4 accent-red-600"
                      />
                    )}
                    <h3 className="text-sm font-semibold text-gray-700">
                      {group.label}
                    </h3>
                    <span className="text-[11px] text-gray-400">
                      ({group.images.length})
                    </span>
                  </div>
                  {renderGrid(group.images)}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Shared gallery preview with previous/next navigation */}
      {previewAsset && (
        <BSImagePreviewModal
          key={previewAsset.id}
          asset={previewAsset}
          position={{ index: previewIndex + 1, total: previewCount }}
          onClose={() => setPreviewId(null)}
          onPrev={previewCount > 1 ? goPrev : undefined}
          onNext={previewCount > 1 ? goNext : undefined}
          onDeleteRequest={requestPreviewDelete}
        />
      )}

      {/* Bulk / single delete confirmation */}
      <BSModal
        open={deleteIds !== null}
        onClose={() => setDeleteIds(null)}
        title={deleteIds && deleteIds.length > 1 ? "Delete images" : "Delete image"}
        sizeClassName="max-w-sm"
        disableFullscreen
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteIds(null)}
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
            {deleteIds && deleteIds.length > 1
              ? `Are you sure you want to delete ${deleteIds.length} images from the library? This action cannot be undone.`
              : "Are you sure you want to delete this image from the library? This action cannot be undone."}
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

export default BSImageLibrary;
