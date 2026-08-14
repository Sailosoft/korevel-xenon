// BSVideoGenerator.Hooks — Client logic for generating + persisting AI videos.
//
// `useBSVideoGenerator` calls the `/api/bunny-studio/video/generate` route
// (server-side provider keys via Helix config, submit → poll → download
// orchestrated by the Helix video adapter) and persists every successful result
// into the local `videoLibrary` table so the Video Library page stays fully
// offline. Videos are stored as base64 data URLs.

"use client";

import { useCallback, useRef, useState } from "react";
import type { HelixAIProvider } from "@/src/modules/helix";
import {
  BS_API_TOKEN_HEADER,
  getBSApiToken,
} from "../../BSApiSecurity";
import { bsDB } from "../../BSDatabase";
import type { BSVideoAsset, BSVideoSize } from "./BSVideoGenerator.Types";

// ─── Public types ───────────────────────────────────────────────────────

export interface BSGenerateVideoOptions {
  /** The prompt describing the video to create */
  prompt: string;
  /** Helix video provider (e.g. "siliconFlow") */
  provider: HelixAIProvider;
  /** Video model id for the provider */
  model: string;
  /** Optional size preset (default: "1280x720") */
  size?: BSVideoSize;
  /** Optional base64 image data URL for image-to-video models */
  image?: string;
}

/** Raw generated video as returned by the API route. */
export interface BSGeneratedVideo {
  url: string;
}

/** Normalized API response. */
export interface BSGenerateVideoResult {
  videos: BSGeneratedVideo[];
  provider: HelixAIProvider;
  model: string;
  size: string;
  prompt: string;
}

export type BSVideoGenerationStatus =
  | "idle"
  | "generating"
  | "success"
  | "error";

export interface BSVideoGenerationState {
  status: BSVideoGenerationStatus;
  /** Human-readable error when status === "error" */
  error: string;
  /** Persisted assets from the most recent successful batch */
  videos: BSVideoAsset[];
  /** Time taken by the last generation (ms) */
  elapsedMs: number;
}

const INITIAL_STATE: BSVideoGenerationState = {
  status: "idle",
  error: "",
  videos: [],
  elapsedMs: 0,
};

// ─── Duration helper ────────────────────────────────────────────────────
// Reads the duration of a (data-URL) video by loading its metadata into a
// temporary <video> element. Resolves to 0 when the duration cannot be read
// (e.g. malformed/unsupported source) so generation never fails on it.

const DURATION_LOAD_TIMEOUT_MS = 5000;

async function getVideoDuration(url: string): Promise<number> {
  return new Promise<number>((resolve) => {
    let settled = false;
    const settle = (value: number) => {
      if (settled) return;
      settled = true;
      try {
        video.removeAttribute("src");
        video.load();
      } catch {
        /* ignore cleanup errors */
      }
      resolve(value);
    };

    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () =>
      settle(Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0);
    video.onerror = () => settle(0);
    video.onabort = () => settle(0);
    video.src = url;

    // Safety net so a hung metadata load can never block the result display.
    setTimeout(() => settle(0), DURATION_LOAD_TIMEOUT_MS);
  });
}

// ─── Hook ───────────────────────────────────────────────────────────────

export function useBSVideoGenerator() {
  const [state, setState] = useState<BSVideoGenerationState>(INITIAL_STATE);
  // Guards against stale responses when a newer generation is already running.
  const requestIdRef = useRef(0);

  const generate = useCallback(
    async (opts: BSGenerateVideoOptions): Promise<BSVideoAsset[]> => {
      const requestId = ++requestIdRef.current;
      const started = performance.now();
      setState((s) => ({ ...s, status: "generating", error: "", videos: [] }));

      const finish = (patch: Partial<BSVideoGenerationState>) => {
        if (requestId !== requestIdRef.current) return;
        setState((s) => ({
          ...s,
          status: patch.status ?? "error",
          error: patch.error ?? "",
          videos: patch.videos ?? s.videos,
          elapsedMs:
            patch.elapsedMs ??
            Math.max(performance.now() - started, 0),
        }));
      };

      try {
        const res = await fetch("/api/bunny-studio/video/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            [BS_API_TOKEN_HEADER]: getBSApiToken() ?? "",
          },
          body: JSON.stringify({
            prompt: opts.prompt,
            provider: opts.provider,
            model: opts.model,
            size: opts.size ?? "1280x720",
            ...(opts.image ? { image: opts.image } : {}),
          }),
        });

        const data = (await res.json()) as Partial<BSGenerateVideoResult> & {
          error?: string;
        };

        if (!res.ok) {
          throw new Error(data.error ?? "Video generation failed.");
        }

        const now = new Date().toISOString();

        // Only videos with a URL can be displayed/persisted.
        const returnedVideos = (data.videos ?? []).filter((v) => !!v.url);

        // Read the duration of every returned video (in parallel). Data URLs
        // are local, so metadata loads are fast; each is capped by a timeout.
        const durations = await Promise.all(
          returnedVideos.map((v) => getVideoDuration(v.url)),
        );

        // Build the display assets straight from the response (the server
        // already returns self-contained base64 data URLs). This happens
        // synchronously so the loading overlay ALWAYS transitions to the result
        // the moment the 200 response arrives — persistence never blocks it.
        const displayAssets: BSVideoAsset[] = returnedVideos.map((v, idx) => ({
          id: `gen-${Date.now()}-${idx}`,
          prompt: opts.prompt,
          provider: data.provider ?? opts.provider,
          model: data.model ?? opts.model,
          url: v.url,
          size: data.size ?? opts.size ?? "1280x720",
          duration: durations[idx] ?? 0,
          createdDate: now,
        }));

        // Persist into the library — awaited so the Video Library reflects the
        // new video the moment generation completes, but capped by a timeout so
        // a stuck IndexedDB write can never leave the UI frozen on "generating".
        // Videos are larger than images, so allow a longer write window.
        const persist = (async () => {
          for (let idx = 0; idx < returnedVideos.length; idx++) {
            const v = returnedVideos[idx];
            try {
              await bsDB.videoLibraryRepo.create({
                prompt: opts.prompt,
                provider: data.provider ?? opts.provider,
                model: data.model ?? opts.model,
                url: v.url,
                size: data.size ?? opts.size ?? "1280x720",
                duration: durations[idx] ?? 0,
                createdDate: now,
              });
            } catch (persistErr) {
              console.error(
                "[BSVideoGenerator] Failed to persist generated video:",
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
                "[BSVideoGenerator] Persistence took too long; continuing.",
              );
              resolve();
            }, 60000);
          }),
        ]);

        finish({
          status: "success",
          error: "",
          videos: displayAssets,
          elapsedMs: performance.now() - started,
        });

        return displayAssets;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Video generation failed.";
        finish({ status: "error", error: message });
        return [];
      }
    },
    [],
  );

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  return { state, generate, reset };
}
