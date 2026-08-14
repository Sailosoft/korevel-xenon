// BSTranscriptionLibrary.Component — The Transcription Library grid.
//
// Displays every transcription produced by the Transcription module (persisted
// to the local `transcriptionLibrary` IndexedDB table), newest first, using the
// shared BSTranscriptionCard which provides Re-listen + Download + Delete.
//
// Deliberately does NOT use useLiveQuery — it loads on mount and whenever the
// `refreshKey` prop changes, so the module can bump the key right after a
// successful transcription and the grid updates deterministically.

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { FileText, FileText as FileOff, AlertCircle } from "lucide-react";
import { bsDB } from "../../BSDatabase";
import { BSTranscriptionCard } from "./BSTranscriptionCard";
import type { BSTranscriptionAsset } from "./BSTranscription.Types";

// ─── Component ──────────────────────────────────────────────────────────

export interface BSTranscriptionLibraryProps {
  /** Optional extra classes for the grid wrapper */
  className?: string;
  /** Optional heading above the grid (default: "Transcription Library") */
  title?: string;
  /** Show the heading + count summary (default: true) */
  showHeader?: boolean;
  /** Bump this number to force a reload (e.g. after a new transcription). */
  refreshKey?: number;
  /** Only render the newest N transcripts. Used by the module's compact preview. */
  limit?: number;
}

export function BSTranscriptionLibrary({
  className = "",
  title = "Transcription Library",
  showHeader = true,
  refreshKey = 0,
  limit,
}: BSTranscriptionLibraryProps) {
  const [transcripts, setTranscripts] = useState<BSTranscriptionAsset[] | null>(
    null,
  );
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const rows = await bsDB.transcriptionLibrary.toArray();
      setTranscripts(
        [...rows].sort((a, b) =>
          b.createdDate.localeCompare(a.createdDate),
        ),
      );
      setError("");
    } catch (err) {
      console.error(
        "[BSTranscriptionLibrary] Failed to read the transcription library:",
        err,
      );
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load the transcription library.",
      );
      setTranscripts([]);
    }
  }, []);

  // Load on mount and whenever the module signals a new transcript was saved.
  // setState happens after `await` inside load(), never synchronously.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load, refreshKey]);

  const handleDeleted = useCallback(() => {
    void load();
  }, [load]);

  const loading = transcripts === null;
  const visibleTranscripts = limit ? transcripts?.slice(0, limit) : transcripts;

  return (
    <section className={className}>
      {showHeader && (
        <div className="mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-red-600" />
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {!loading && (
            <span className="text-xs text-gray-400">
              ({transcripts.length}{" "}
              {transcripts.length === 1 ? "transcript" : "transcripts"})
            </span>
          )}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl bg-gray-200 animate-pulse h-52"
            />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : transcripts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white/60 py-16 text-center">
          <FileOff className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-600">
            No transcripts yet
          </p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">
            Transcribe your first audio with the Transcription tool and it will
            appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {visibleTranscripts?.map((asset) => (
            <BSTranscriptionCard
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

export default BSTranscriptionLibrary;
