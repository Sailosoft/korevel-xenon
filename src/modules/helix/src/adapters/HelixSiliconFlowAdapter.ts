/**
 * ───────────────────────────────────────────────────────────────────────────────
 * HelixSiliconFlowVideoAdapter — SiliconFlow video generation adapter
 * ───────────────────────────────────────────────────────────────────────────────
 * Adapts Helix to SiliconFlow's async video API:
 *
 *   1. `POST /v1/video/submit`  → submit a video job, returns a `requestId`.
 *   2. `POST /v1/video/status`  → poll the job (body: { requestId }) until it
 *      succeeds, returns the rendered video URL(s) under `results.videos`.
 *   3. Download the video blob from the returned URL and return it to the caller.
 *
 * API key + base URL are resolved from HelixConfig (HELIX_AI_PROVIDERS →
 * "siliconFlow") so no duplicate provider configuration is maintained here.
 * A per-call override is still accepted for BYOK scenarios.
 *
 * Full provider docs: src/modules/bunny-studio/docs/Feature/VideoSubmit.md
 */

import { HELIX_AI_PROVIDERS } from "../HelixConfig";
import type { HelixVideoSize } from "../HelixConfig.Video";

// ── Public types ──────────────────────────────────────────────────────────────

/** Payload for the `POST /v1/video/submit` endpoint. */
export interface HelixVideoSubmitOptions {
  /** Model id (must be a Helix video model, e.g. "Wan-AI/Wan2.2-T2V-A14B") */
  model: string;
  /** Text prompt describing the video to generate */
  prompt: string;
  /** Length-width ratio of the generated video (e.g. "1280x720") */
  image_size: HelixVideoSize;
  /** Optional negative prompt */
  negative_prompt?: string;
  /**
   * Base64 image data URL for image-to-video models only
   * (e.g. "data:image/png;base64,XXX").
   */
  image?: string;
  /** Seed for the random number generator */
  seed?: number;
}

/** Response of `POST /v1/video/submit`. */
export interface HelixVideoSubmission {
  requestId: string;
}

/** A single rendered video returned by the status endpoint. */
export interface HelixVideoResult {
  url: string;
  cover?: string;
  seed?: number;
}

/** Lifecycle states reported by SiliconFlow's video status endpoint. */
export type HelixVideoTaskStatus =
  | "InQueue"
  | "InProgress"
  | "Succeed"
  | "Failed";

/** Response of `POST /v1/video/status`. */
export interface HelixVideoStatusResponse {
  /** Status of the operation: Succeed / InQueue / InProgress / Failed */
  status: HelixVideoTaskStatus;
  /** Reason for the operation (populated on failure) */
  reason?: string;
  results?: {
    /** The rendered video(s). URL is valid for ~1 hour — persist promptly. */
    videos?: HelixVideoResult[];
    /** Seed value used for the generation */
    seed?: number;
  };
}

/** Options controlling the poll-and-download orchestration. */
export interface HelixVideoGenerateOptions extends HelixVideoSubmitOptions {
  /** Max time to wait for the video to finish rendering (default: 10 min) */
  timeoutMs?: number;
  /** Poll interval in ms (default: 5000) */
  intervalMs?: number;
  /** Optional progress callback invoked on every poll */
  onProgress?: (status: HelixVideoStatusResponse) => void;
}

/** Options accepted by the adapter constructor (BYOK overrides). */
export interface HelixSiliconFlowAdapterOptions {
  apiKey?: string;
  baseUrl?: string;
}

/**
 * Contract for Helix video adapters. Any provider that exposes an async
 * submit → poll → download video API can implement this interface.
 */
export interface HelixVideoAdapter {
  /** Submit a video job and return the requestId. */
  submitVideo(options: HelixVideoSubmitOptions): Promise<HelixVideoSubmission>;
  /** Fetch the current status of a submitted video job. */
  getVideoStatus(requestId: string): Promise<HelixVideoStatusResponse>;
  /** Poll a submitted job until it succeeds (or fails/times out). */
  waitForVideo(
    requestId: string,
    options?: {
      timeoutMs?: number;
      intervalMs?: number;
      onProgress?: (status: HelixVideoStatusResponse) => void;
    },
  ): Promise<HelixVideoResult>;
  /** Submit → wait → download, returning the rendered video as a Blob. */
  generateVideo(options: HelixVideoGenerateOptions): Promise<Blob>;
}

// ── Adapter ───────────────────────────────────────────────────────────────────

const DEFAULT_BASE_URL = "https://api.siliconflow.com/v1";
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const DEFAULT_INTERVAL_MS = 5000;

const PENDING_STATUSES: ReadonlySet<HelixVideoTaskStatus> = new Set([
  "InQueue",
  "InProgress",
]);

export class HelixSiliconFlowVideoAdapter implements HelixVideoAdapter {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: HelixSiliconFlowAdapterOptions = {}) {
    const config = HELIX_AI_PROVIDERS.find(
      (p) => p.provider === "siliconFlow",
    );
    this.apiKey = options.apiKey?.trim() || config?.apiKey || "";
    this.baseUrl = (
      options.baseUrl?.trim() || config?.endpoint || DEFAULT_BASE_URL
    ).replace(/\/+$/, "");
  }

  private assertApiKey(): void {
    if (!this.apiKey) {
      throw new Error(
        '[HelixSiliconFlowVideoAdapter] No valid API key configured for provider "siliconFlow". ' +
          "Set SILICON_FLOW_API_KEY in your environment or pass an apiKey override.",
      );
    }
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, init);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `[HelixSiliconFlowVideoAdapter] ${init?.method ?? "GET"} ${path} failed ` +
          `(${res.status}): ${text || res.statusText}`,
      );
    }
    return (await res.json()) as T;
  }

  /** Submit a video job — returns the requestId used for polling. */
  public async submitVideo(
    options: HelixVideoSubmitOptions,
  ): Promise<HelixVideoSubmission> {
    this.assertApiKey();
    const body: Record<string, unknown> = {
      model: options.model,
      prompt: options.prompt,
      image_size: options.image_size,
    };
    if (options.negative_prompt) body.negative_prompt = options.negative_prompt;
    if (options.image) body.image = options.image;
    if (options.seed !== undefined) body.seed = options.seed;

    return this.request<HelixVideoSubmission>("/video/submit", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  /** Fetch the current status of a submitted video job. */
  public async getVideoStatus(
    requestId: string,
  ): Promise<HelixVideoStatusResponse> {
    this.assertApiKey();
    return this.request<HelixVideoStatusResponse>("/video/status", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requestId }),
    });
  }

  /** Poll a submitted job until it succeeds (or fails / times out). */
  public async waitForVideo(
    requestId: string,
    options: {
      timeoutMs?: number;
      intervalMs?: number;
      onProgress?: (status: HelixVideoStatusResponse) => void;
    } = {},
  ): Promise<HelixVideoResult> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
    const started = Date.now();

    while (true) {
      const status = await this.getVideoStatus(requestId);
      options.onProgress?.(status);

      if (status.status === "Succeed") {
        const videos = status.results?.videos ?? [];
        const video = videos[0];
        if (!video?.url) {
          throw new Error(
            `[HelixSiliconFlowVideoAdapter] Video succeeded but no video URL was returned for request "${requestId}".`,
          );
        }
        return video;
      }

      if (status.status === "Failed") {
        throw new Error(
          `[HelixSiliconFlowVideoAdapter] Video generation failed for request "${requestId}": ` +
            (status.reason || "unknown error"),
        );
      }

      if (!PENDING_STATUSES.has(status.status)) {
        throw new Error(
          `[HelixSiliconFlowVideoAdapter] Unknown video status "${status.status}" for request "${requestId}".`,
        );
      }

      if (Date.now() - started >= timeoutMs) {
        throw new Error(
          `[HelixSiliconFlowVideoAdapter] Timed out waiting for video request "${requestId}" after ${timeoutMs}ms.`,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  /**
   * End-to-end generation: submit the video job, poll until it is ready, then
   * download the rendered video from its URL and return it as a Blob.
   */
  public async generateVideo(
    options: HelixVideoGenerateOptions,
  ): Promise<Blob> {
    const { requestId } = await this.submitVideo(options);
    const result = await this.waitForVideo(requestId, {
      timeoutMs: options.timeoutMs,
      intervalMs: options.intervalMs,
      onProgress: options.onProgress,
    });

    const res = await fetch(result.url);
    if (!res.ok) {
      throw new Error(
        `[HelixSiliconFlowVideoAdapter] Failed to download rendered video (${res.status}: ${res.statusText}).`,
      );
    }
    return await res.blob();
  }
}
