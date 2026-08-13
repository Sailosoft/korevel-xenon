// BSImageLibrary.Component — The AI Image Library grid.
//
// Displays every image produced by the Image Generator (persisted to the local
// `imageLibrary` IndexedDB table), newest first, using the shared BSImageCard
// which provides Download + Delete on each image.
//
// Deliberately does NOT use useLiveQuery — it loads on mount and whenever the
// `refreshKey` prop changes, so the generator can bump the key right after a
// successful generation and the grid updates deterministically. Images are
// stored as base64 data URLs, so nothing re-hits the provider to view,
// download, or re-render the gallery.

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Images, ImageOff, AlertCircle } from "lucide-react";
import { bsDB } from "../../BSDatabase";
import { BSImageCard } from "./BSImageCard";
import type { BSImageAsset } from "./BSImageGenerator.Types";

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
}

export function BSImageLibrary({
  className = "",
  title = "Image Library",
  showHeader = true,
  refreshKey = 0,
}: BSImageLibraryProps) {
  const [images, setImages] = useState<BSImageAsset[] | null>(null);
  const [error, setError] = useState("");

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

  return (
    <section className={className}>
      {showHeader && (
        <div className="mb-4 flex items-center gap-2">
          <Images className="w-5 h-5 text-red-600" />
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {!loading && (
            <span className="text-xs text-gray-400">
              ({images.length} {images.length === 1 ? "image" : "images"})
            </span>
          )}
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
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white/60 py-16 text-center">
          <ImageOff className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-600">No images yet</p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">
            Generate your first image with the Image Generator and it will
            appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {images.map((asset) => (
            <BSImageCard
              key={asset.id}
              asset={asset}
              reveal="hover"
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default BSImageLibrary;
