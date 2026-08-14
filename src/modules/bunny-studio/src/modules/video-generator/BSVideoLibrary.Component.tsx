// BSVideoLibrary.Component — The AI Video Library grid.
//
// Displays every video produced by the Video Generator (persisted to the local
// `videoLibrary` IndexedDB table), newest first, using the shared BSVideoCard
// which provides Play + Download + Delete on each video.
//
// Deliberately does NOT use useLiveQuery — it loads on mount and whenever the
// `refreshKey` prop changes, so the generator can bump the key right after a
// successful generation and the grid updates deterministically. Videos are
// stored as base64 data URLs, so nothing re-hits the provider to play,
// download, or re-render the gallery.

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Film, VideoOff, AlertCircle } from "lucide-react";
import { bsDB } from "../../BSDatabase";
import { BSVideoCard } from "./BSVideoCard";
import type { BSVideoAsset } from "./BSVideoGenerator.Types";

// ─── Component ──────────────────────────────────────────────────────────

export interface BSVideoLibraryProps {
  /** Optional extra classes for the grid wrapper */
  className?: string;
  /** Optional heading above the grid (default: "Video Library") */
  title?: string;
  /** Show the heading + count summary (default: true) */
  showHeader?: boolean;
  /** Bump this number to force a reload (e.g. after generating a new video). */
  refreshKey?: number;
  /** Only render the newest N videos. Used by the generator's compact preview. */
  limit?: number;
}

export function BSVideoLibrary({
  className = "",
  title = "Video Library",
  showHeader = true,
  refreshKey = 0,
  limit,
}: BSVideoLibraryProps) {
  const [videos, setVideos] = useState<BSVideoAsset[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const rows = await bsDB.videoLibrary.toArray();
      setVideos(
        [...rows].sort((a, b) =>
          b.createdDate.localeCompare(a.createdDate),
        ),
      );
      setError("");
    } catch (err) {
      console.error("[BSVideoLibrary] Failed to read the video library:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load the video library.",
      );
      setVideos([]);
    }
  }, []);

  // Load on mount and whenever the generator signals a new video was saved.
  // setState happens after `await` inside load(), never synchronously.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load, refreshKey]);

  const handleDeleted = useCallback(() => {
    void load();
  }, [load]);

  const loading = videos === null;
  // Newest-first already sorted in `load`; slice the last `limit` for the
  // generator's compact preview. The header count still reflects the full
  // library size.
  const visibleVideos = limit ? videos?.slice(0, limit) : videos;

  return (
    <section className={className}>
      {showHeader && (
        <div className="mb-4 flex items-center gap-2">
          <Film className="w-5 h-5 text-red-600" />
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {!loading && (
            <span className="text-xs text-gray-400">
              ({videos.length} {videos.length === 1 ? "video" : "videos"})
            </span>
          )}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-video rounded-xl bg-gray-200 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white/60 py-16 text-center">
          <VideoOff className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-600">No videos yet</p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">
            Generate your first video with the Video Generator and it will
            appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {visibleVideos?.map((asset) => (
            <BSVideoCard
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

export default BSVideoLibrary;
