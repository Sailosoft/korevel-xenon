// BSSpeechLibrary.Component — The AI Speech Library grid.
//
// Displays every audio produced by the Speech Generator (persisted to the local
// `speechLibrary` IndexedDB table), newest first, using the shared BSSpeechCard
// which provides Listen + Download + Delete on each audio.
//
// Deliberately does NOT use useLiveQuery — it loads on mount and whenever the
// `refreshKey` prop changes, so the generator can bump the key right after a
// successful generation and the grid updates deterministically. Audios are
// stored as base64 data URLs, so nothing re-hits the provider to play,
// download, or re-render the gallery.

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AudioLines, AudioLines as AudioOff, AlertCircle } from "lucide-react";
import { bsDB } from "../../BSDatabase";
import { BSSpeechCard } from "./BSSpeechCard";
import type { BSSpeechAsset } from "./BSSpeechGenerator.Types";

// ─── Component ──────────────────────────────────────────────────────────

export interface BSSpeechLibraryProps {
  /** Optional extra classes for the grid wrapper */
  className?: string;
  /** Optional heading above the grid (default: "Speech Library") */
  title?: string;
  /** Show the heading + count summary (default: true) */
  showHeader?: boolean;
  /** Bump this number to force a reload (e.g. after generating new audio). */
  refreshKey?: number;
  /** Only render the newest N audios. Used by the generator's compact preview. */
  limit?: number;
}

export function BSSpeechLibrary({
  className = "",
  title = "Speech Library",
  showHeader = true,
  refreshKey = 0,
  limit,
}: BSSpeechLibraryProps) {
  const [speeches, setSpeeches] = useState<BSSpeechAsset[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const rows = await bsDB.speechLibrary.toArray();
      setSpeeches(
        [...rows].sort((a, b) =>
          b.createdDate.localeCompare(a.createdDate),
        ),
      );
      setError("");
    } catch (err) {
      console.error("[BSSpeechLibrary] Failed to read the speech library:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load the speech library.",
      );
      setSpeeches([]);
    }
  }, []);

  // Load on mount and whenever the generator signals new audio was saved.
  // setState happens after `await` inside load(), never synchronously.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load, refreshKey]);

  const handleDeleted = useCallback(() => {
    void load();
  }, [load]);

  const loading = speeches === null;
  // Newest-first already sorted in `load`; slice the last `limit` for the
  // generator's compact preview. The header count still reflects the full
  // library size.
  const visibleSpeeches = limit ? speeches?.slice(0, limit) : speeches;

  return (
    <section className={className}>
      {showHeader && (
        <div className="mb-4 flex items-center gap-2">
          <AudioLines className="w-5 h-5 text-red-600" />
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {!loading && (
            <span className="text-xs text-gray-400">
              ({speeches.length} {speeches.length === 1 ? "audio" : "audios"})
            </span>
          )}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl bg-gray-200 animate-pulse h-48"
            />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : speeches.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white/60 py-16 text-center">
          <AudioOff className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-600">No audio yet</p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">
            Generate your first speech with the Speech Generator and it will
            appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {visibleSpeeches?.map((asset) => (
            <BSSpeechCard
              key={asset.id}
              asset={asset}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default BSSpeechLibrary;
