// BSSpeechGenerator.Hooks — Client logic for generating + persisting AI speech.
//
// `useBSSpeechGenerator` calls the `/api/bunny-studio/speech/generate` route
// (server-side provider keys via Helix config, text-to-speech orchestrated by
// the Helix speech adapter) and persists every successful result into the local
// `speechLibrary` table so the Speech Library page stays fully offline. Audios
// are stored as base64 data URLs so they play/download without re-hitting the
// provider.
//
// `useBSSpeechVoices` fetches the user-defined custom voices (GET
// /api/bunny-studio/speech/voices → provider /audio/voice/list) and supplements
// the built-in per-model voice enums shown in the generator UI.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { HelixAIProvider, HelixSpeechVoice } from "@/src/modules/helix";
import {
  BS_API_TOKEN_HEADER,
  getBSApiToken,
} from "../../BSApiSecurity";
import { bsDB } from "../../BSDatabase";
import type {
  BSSpeechAsset,
  BSSpeechFormat,
} from "./BSSpeechGenerator.Types";

// ─── Public types ───────────────────────────────────────────────────────

export interface BSGenerateSpeechOptions {
  /** The text to speak */
  input: string;
  /** Helix speech provider (e.g. "siliconFlow") */
  provider: HelixAIProvider;
  /** Speech model id for the provider */
  model: string;
  /** Voice — built-in "model:voice" or custom "speech:..." URI */
  voice?: string;
  /** Audio output format (default: "mp3") */
  format?: BSSpeechFormat;
  /** Output sample rate (optional) */
  sampleRate?: number;
  /** Playback speed 0.25–4.0 (default: 1) */
  speed?: number;
  /** Gain in dB -10..10 (default: 0) */
  gain?: number;
}

/** Raw generated speech as returned by the API route. */
export interface BSGeneratedSpeech {
  url: string;
}

/** Normalized API response. */
export interface BSGenerateSpeechResult {
  speeches: BSGeneratedSpeech[];
  provider: HelixAIProvider;
  model: string;
  voice: string;
  response_format: string;
  sample_rate: number | null;
  input: string;
}

export type BSSpeechGenerationStatus =
  | "idle"
  | "generating"
  | "success"
  | "error";

export interface BSSpeechGenerationState {
  status: BSSpeechGenerationStatus;
  /** Human-readable error when status === "error" */
  error: string;
  /** Persisted assets from the most recent successful generation */
  speeches: BSSpeechAsset[];
  /** Time taken by the last generation (ms) */
  elapsedMs: number;
}

const INITIAL_STATE: BSSpeechGenerationState = {
  status: "idle",
  error: "",
  speeches: [],
  elapsedMs: 0,
};

// ─── Duration helper ────────────────────────────────────────────────────
// Reads the duration of a (data-URL) audio by loading its metadata into a
// temporary <audio> element. Resolves to 0 when the duration cannot be read
// (e.g. malformed/unsupported source) so generation never fails on it.

const DURATION_LOAD_TIMEOUT_MS = 5000;

async function getAudioDuration(url: string): Promise<number> {
  return new Promise<number>((resolve) => {
    let settled = false;
    const settle = (value: number) => {
      if (settled) return;
      settled = true;
      try {
        audio.removeAttribute("src");
        audio.load();
      } catch {
        /* ignore cleanup errors */
      }
      resolve(value);
    };

    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.onloadedmetadata = () =>
      settle(Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0);
    audio.onerror = () => settle(0);
    audio.onabort = () => settle(0);
    audio.src = url;

    // Safety net so a hung metadata load can never block the result display.
    setTimeout(() => settle(0), DURATION_LOAD_TIMEOUT_MS);
  });
}

// ─── Hook: generate ─────────────────────────────────────────────────────

export function useBSSpeechGenerator() {
  const [state, setState] = useState<BSSpeechGenerationState>(INITIAL_STATE);
  // Guards against stale responses when a newer generation is already running.
  const requestIdRef = useRef(0);

  const generate = useCallback(
    async (opts: BSGenerateSpeechOptions): Promise<BSSpeechAsset[]> => {
      const requestId = ++requestIdRef.current;
      const started = performance.now();
      setState((s) => ({ ...s, status: "generating", error: "", speeches: [] }));

      const finish = (patch: Partial<BSSpeechGenerationState>) => {
        if (requestId !== requestIdRef.current) return;
        setState((s) => ({
          ...s,
          status: patch.status ?? "error",
          error: patch.error ?? "",
          speeches: patch.speeches ?? s.speeches,
          elapsedMs:
            patch.elapsedMs ??
            Math.max(performance.now() - started, 0),
        }));
      };

      try {
        const res = await fetch("/api/bunny-studio/speech/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            [BS_API_TOKEN_HEADER]: getBSApiToken() ?? "",
          },
          body: JSON.stringify({
            input: opts.input,
            provider: opts.provider,
            model: opts.model,
            ...(opts.voice ? { voice: opts.voice } : {}),
            response_format: opts.format ?? "mp3",
            ...(opts.sampleRate ? { sample_rate: opts.sampleRate } : {}),
            ...(opts.speed !== undefined ? { speed: opts.speed } : {}),
            ...(opts.gain !== undefined ? { gain: opts.gain } : {}),
          }),
        });

        const data = (await res.json()) as Partial<BSGenerateSpeechResult> & {
          error?: string;
        };

        if (!res.ok) {
          throw new Error(data.error ?? "Speech generation failed.");
        }

        const now = new Date().toISOString();

        // Only audios with a URL can be played/persisted.
        const returnedSpeeches = (data.speeches ?? []).filter((s) => !!s.url);

        // Read the duration of every returned audio (in parallel). Data URLs
        // are local, so metadata loads are fast; each is capped by a timeout.
        const durations = await Promise.all(
          returnedSpeeches.map((s) => getAudioDuration(s.url)),
        );

        // Build the display assets straight from the response (the server
        // already returns self-contained base64 data URLs). This happens
        // synchronously so the loading overlay ALWAYS transitions to the result
        // the moment the 200 response arrives — persistence never blocks it.
        const displayAssets: BSSpeechAsset[] = returnedSpeeches.map((s, idx) => ({
          id: `gen-${Date.now()}-${idx}`,
          input: opts.input,
          provider: data.provider ?? opts.provider,
          model: data.model ?? opts.model,
          voice: data.voice ?? opts.voice ?? "",
          url: s.url,
          format: (data.response_format as BSSpeechFormat) ?? opts.format ?? "mp3",
          sampleRate: data.sample_rate ?? opts.sampleRate ?? 0,
          duration: durations[idx] ?? 0,
          createdDate: now,
        }));

        // Persist into the library — awaited so the Speech Library reflects the
        // new audio the moment generation completes, but capped by a timeout so
        // a stuck IndexedDB write can never leave the UI frozen on "generating".
        const persist = (async () => {
          for (let idx = 0; idx < returnedSpeeches.length; idx++) {
            const s = returnedSpeeches[idx];
            try {
              await bsDB.speechLibraryRepo.create({
                input: opts.input,
                provider: data.provider ?? opts.provider,
                model: data.model ?? opts.model,
                voice: data.voice ?? opts.voice ?? "",
                url: s.url,
                format: (data.response_format as BSSpeechFormat) ?? opts.format ?? "mp3",
                sampleRate: data.sample_rate ?? opts.sampleRate ?? 0,
                duration: durations[idx] ?? 0,
                createdDate: now,
              });
            } catch (persistErr) {
              console.error(
                "[BSSpeechGenerator] Failed to persist generated speech:",
                persistErr,
              );
            }
          }
        })();

        await Promise.race([
          persist,
          new Promise<void>((resolve) => {
            setTimeout(() => {
              console.warn(
                "[BSSpeechGenerator] Persistence took too long; continuing.",
              );
              resolve();
            }, 60000);
          }),
        ]);

        finish({
          status: "success",
          error: "",
          speeches: displayAssets,
          elapsedMs: performance.now() - started,
        });

        return displayAssets;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Speech generation failed.";
        finish({ status: "error", error: message });
        return [];
      }
    },
    [],
  );

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  return { state, generate, reset };
}

// ─── Hook: custom voices ────────────────────────────────────────────────

export function useBSSpeechVoices() {
  const [voices, setVoices] = useState<HelixSpeechVoice[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bunny-studio/speech/voices", {
        method: "GET",
        headers: {
          [BS_API_TOKEN_HEADER]: getBSApiToken() ?? "",
        },
      });
      const data = (await res.json()) as {
        voices?: HelixSpeechVoice[];
      };
      setVoices(data.voices ?? []);
    } catch (err) {
      console.warn("[BSSpeechGenerator] Failed to load custom voices:", err);
      setVoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Async fetch — setState happens after `await`, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return { voices, loading, reload: load };
}
