// BSImageGenerator.Hooks — Client logic for generating + persisting AI images.
//
// `useBSImageGenerator` calls the `/api/bunny-studio/image/generate` route
// (OpenAI-compatible, server-side provider keys via Helix config) and persists
// every successful result into the local `imageLibrary` table so the Image
// Library page stays fully offline.

"use client";

import { useCallback, useRef, useState } from "react";
import type { HelixAIProvider } from "@/src/modules/helix";
import {
  BS_API_TOKEN_HEADER,
  getBSApiToken,
} from "../../BSApiSecurity";
import { bsDB } from "../../BSDatabase";
import type { BSImageAsset, BSImageSize } from "./BSImageGenerator.Types";

// ─── Public types ───────────────────────────────────────────────────────

export interface BSGenerateImageOptions {
  /** The prompt describing the image to create */
  prompt: string;
  /** Helix image provider (e.g. "siliconFlow") */
  provider: HelixAIProvider;
  /** Image model id for the provider */
  model: string;
  /** Optional size preset (default: "1024x1024") */
  size?: BSImageSize;
  /** Optional number of images (clamped server-side to 1-4) */
  n?: number;
}

/** Raw generated image as returned by the API route. */
export interface BSGeneratedImage {
  url: string;
  b64_json?: string;
  revised_prompt?: string;
}

/** Normalized API response. */
export interface BSGenerateImageResult {
  images: BSGeneratedImage[];
  provider: HelixAIProvider;
  model: string;
  size: string;
  prompt: string;
}

export type BSImageGenerationStatus =
  | "idle"
  | "generating"
  | "success"
  | "error";

export interface BSImageGenerationState {
  status: BSImageGenerationStatus;
  /** Human-readable error when status === "error" */
  error: string;
  /** Persisted assets from the most recent successful batch */
  images: BSImageAsset[];
  /** Time taken by the last generation (ms) */
  elapsedMs: number;
}

const INITIAL_STATE: BSImageGenerationState = {
  status: "idle",
  error: "",
  images: [],
  elapsedMs: 0,
};

// ─── Hook ───────────────────────────────────────────────────────────────

export function useBSImageGenerator() {
  const [state, setState] = useState<BSImageGenerationState>(INITIAL_STATE);
  // Guards against stale responses when a newer generation is already running.
  const requestIdRef = useRef(0);

  const generate = useCallback(
    async (opts: BSGenerateImageOptions): Promise<BSImageAsset[]> => {
      const requestId = ++requestIdRef.current;
      const started = performance.now();
      setState((s) => ({ ...s, status: "generating", error: "", images: [] }));

      const finish = (patch: Partial<BSImageGenerationState>) => {
        if (requestId !== requestIdRef.current) return;
        setState((s) => ({
          ...s,
          status: patch.status ?? "error",
          error: patch.error ?? "",
          images: patch.images ?? s.images,
          elapsedMs:
            patch.elapsedMs ??
            Math.max(performance.now() - started, 0),
        }));
      };

      try {
        const res = await fetch("/api/bunny-studio/image/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            [BS_API_TOKEN_HEADER]: getBSApiToken() ?? "",
          },
          body: JSON.stringify({
            prompt: opts.prompt,
            provider: opts.provider,
            model: opts.model,
            size: opts.size ?? "1024x1024",
            n: opts.n ?? 1,
          }),
        });

        const data = (await res.json()) as Partial<BSGenerateImageResult> & {
          error?: string;
        };

        if (!res.ok) {
          throw new Error(data.error ?? "Image generation failed.");
        }

        const now = new Date().toISOString();

        // Build the display assets straight from the response (the server
        // already returns self-contained base64 data URLs). This happens
        // synchronously so the loading overlay ALWAYS transitions to the result
        // the moment the 200 response arrives — persistence never blocks it.
        const displayAssets: BSImageAsset[] = (data.images ?? [])
          .filter((img) => !!img.url)
          .map((img, idx) => ({
            id: `gen-${Date.now()}-${idx}`,
            prompt: img.revised_prompt?.trim() || opts.prompt,
            provider: data.provider ?? opts.provider,
            model: data.model ?? opts.model,
            url: img.url,
            size: data.size ?? opts.size ?? "1024x1024",
            createdDate: now,
          }));

        // Persist into the library — awaited so the Image Library reflects the
        // new image the moment generation completes, but capped by a timeout so
        // a stuck IndexedDB write can never leave the UI frozen on "generating".
        const persist = (async () => {
          for (const img of data.images ?? []) {
            if (!img.url) continue;
            try {
              await bsDB.imageLibraryRepo.create({
                prompt: img.revised_prompt?.trim() || opts.prompt,
                provider: data.provider ?? opts.provider,
                model: data.model ?? opts.model,
                url: img.url,
                size: data.size ?? opts.size ?? "1024x1024",
                createdDate: now,
              });
            } catch (persistErr) {
              console.error(
                "[BSImageGenerator] Failed to persist generated image:",
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
                "[BSImageGenerator] Persistence took too long; continuing.",
              );
              resolve();
            }, 6000);
          }),
        ]);

        finish({
          status: "success",
          error: "",
          images: displayAssets,
          elapsedMs: performance.now() - started,
        });

        return displayAssets;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Image generation failed.";
        finish({ status: "error", error: message });
        return [];
      }
    },
    [],
  );

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  return { state, generate, reset };
}
