// BSTranscription.Hooks — Client logic for transcribing + persisting audio.
//
// `useBSTranscription` reads the selected audio file into a base64 data URL
// (so it can be re-listened to offline), uploads it to the
// `/api/bunny-studio/speech/transcribe` route (server-side provider keys via
// Helix config, transcription orchestrated by the Helix speech adapter), and
// persists the resulting transcript into the local `transcriptionLibrary` table
// so the Transcription Library stays fully offline.

"use client";

import { useCallback, useRef, useState } from "react";
import type { HelixAIProvider } from "@/src/modules/helix";
import {
  BS_API_TOKEN_HEADER,
  getBSApiToken,
} from "../../BSApiSecurity";
import { bsDB } from "../../BSDatabase";
import type { BSTranscriptionAsset } from "./BSTranscription.Types";

// ─── Public types ───────────────────────────────────────────────────────

export interface BSTranscribeOptions {
  /** The audio file to transcribe */
  file: File;
  /** Helix transcription provider (e.g. "siliconFlow") */
  provider: HelixAIProvider;
  /** Transcription (STT) model id for the provider */
  model: string;
  /** Optional BCP-47 language hint (e.g. "en", "zh") */
  language?: string;
}

/** Normalized API response. */
export interface BSTranscribeResult {
  text: string;
  provider: HelixAIProvider;
  model: string;
}

export type BSTranscriptionStatus =
  | "idle"
  | "transcribing"
  | "success"
  | "error";

export interface BSTranscriptionState {
  status: BSTranscriptionStatus;
  /** Human-readable error when status === "error" */
  error: string;
  /** Persisted transcripts from the most recent successful transcription */
  transcripts: BSTranscriptionAsset[];
  /** Time taken by the last transcription (ms) */
  elapsedMs: number;
}

const INITIAL_STATE: BSTranscriptionState = {
  status: "idle",
  error: "",
  transcripts: [],
  elapsedMs: 0,
};

// ─── Helpers ────────────────────────────────────────────────────────────

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

/** Read the duration of a local audio File by loading its metadata. Resolves 0
 *  on failure so transcription never blocks on it. */
const DURATION_LOAD_TIMEOUT_MS = 5000;

async function getAudioDurationFromFile(file: File): Promise<number> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<number>((resolve) => {
      let settled = false;
      const settle = (value: number) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      const audio = document.createElement("audio");
      audio.preload = "metadata";
      audio.onloadedmetadata = () =>
        settle(
          Number.isFinite(audio.duration) && audio.duration > 0
            ? audio.duration
            : 0,
        );
      audio.onerror = () => settle(0);
      audio.onabort = () => settle(0);
      audio.src = url;
      setTimeout(() => settle(0), DURATION_LOAD_TIMEOUT_MS);
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ─── Hook ───────────────────────────────────────────────────────────────

export function useBSTranscription() {
  const [state, setState] = useState<BSTranscriptionState>(INITIAL_STATE);
  // Guards against stale responses when a newer transcription is running.
  const requestIdRef = useRef(0);

  const transcribe = useCallback(
    async (opts: BSTranscribeOptions): Promise<BSTranscriptionAsset[]> => {
      const requestId = ++requestIdRef.current;
      const started = performance.now();
      setState((s) => ({
        ...s,
        status: "transcribing",
        error: "",
        transcripts: [],
      }));

      const finish = (patch: Partial<BSTranscriptionState>) => {
        if (requestId !== requestIdRef.current) return;
        setState((s) => ({
          ...s,
          status: patch.status ?? "error",
          error: patch.error ?? "",
          transcripts: patch.transcripts ?? s.transcripts,
          elapsedMs:
            patch.elapsedMs ??
            Math.max(performance.now() - started, 0),
        }));
      };

      try {
        // Read the source audio as a data URL (for offline re-listening) and
        // capture its duration in parallel with the upload prep.
        const [url, duration] = await Promise.all([
          readFileAsDataURL(opts.file),
          getAudioDurationFromFile(opts.file),
        ]);

        const form = new FormData();
        form.append("file", opts.file);
        form.append("provider", opts.provider);
        form.append("model", opts.model);
        if (opts.language?.trim()) form.append("language", opts.language.trim());

        const res = await fetch("/api/bunny-studio/speech/transcribe", {
          method: "POST",
          headers: {
            [BS_API_TOKEN_HEADER]: getBSApiToken() ?? "",
          },
          body: form,
        });

        const data = (await res.json()) as Partial<BSTranscribeResult> & {
          error?: string;
        };

        if (!res.ok) {
          throw new Error(data.error ?? "Transcription failed.");
        }

        const text = data.text ?? "";
        const now = new Date().toISOString();

        const asset: BSTranscriptionAsset = {
          id: `gen-${Date.now()}`,
          fileName: opts.file.name,
          provider: data.provider ?? opts.provider,
          model: data.model ?? opts.model,
          language: opts.language?.trim() ?? "",
          text,
          url,
          duration,
          createdDate: now,
        };

        // Persist into the library — awaited so the library reflects the new
        // transcript the moment it's ready, but capped by a timeout so a stuck
        // IndexedDB write can never leave the UI frozen on "transcribing".
        const persist = (async () => {
          try {
            await bsDB.transcriptionLibraryRepo.create({
              fileName: asset.fileName,
              provider: asset.provider,
              model: asset.model,
              language: asset.language,
              text: asset.text,
              url: asset.url,
              duration: asset.duration,
              createdDate: asset.createdDate,
            });
          } catch (persistErr) {
            console.error(
              "[BSTranscription] Failed to persist transcription:",
              persistErr,
            );
          }
        })();

        await Promise.race([
          persist,
          new Promise<void>((resolve) => {
            setTimeout(() => {
              console.warn(
                "[BSTranscription] Persistence took too long; continuing.",
              );
              resolve();
            }, 30000);
          }),
        ]);

        finish({
          status: "success",
          error: "",
          transcripts: [asset],
          elapsedMs: performance.now() - started,
        });

        return [asset];
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Transcription failed.";
        finish({ status: "error", error: message });
        return [];
      }
    },
    [],
  );

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  return { state, transcribe, reset };
}
