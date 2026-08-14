/**
 * ───────────────────────────────────────────────────────────────────────────────
 * HelixSiliconFlowSpeechAdapter — SiliconFlow speech (TTS) adapter
 * ───────────────────────────────────────────────────────────────────────────────
 * Adapts Helix to SiliconFlow's speech API:
 *
 *   1. `POST /v1/audio/speech`  → generate audio from input text. Returns the
 *      raw binary audio data (mp3 / opus / wav / pcm), which the caller owns.
 *   2. `GET  /v1/audio/voice/list` → list user-defined custom voices uploaded
 *      by the account, returned as `speech:...` URIs usable as the `voice`
 *      field (mutually exclusive with the built-in "model:voice" names).
 *
 * API key + base URL are resolved from HelixConfig (HELIX_AI_PROVIDERS →
 * "siliconFlow") so no duplicate provider configuration is maintained here.
 * A per-call override is still accepted for BYOK scenarios.
 *
 * The HelixSpeechAdapter interface is intentionally provider-agnostic so other
 * providers (e.g. OpenAI TTS, ElevenLabs) can be integrated later without
 * changing consumers — only the implementation changes.
 *
 * Full provider docs: src/modules/bunny-studio/docs/Feature/AudioSubmit.md
 */

import { HELIX_AI_PROVIDERS } from "../HelixConfig";
import { isOmniTranscriptionModel } from "../HelixConfig.Speech";
import type {
  HelixSpeechResponseFormat,
  HelixSpeechSampleRate,
} from "../HelixConfig.Speech";

// ── Public types ──────────────────────────────────────────────────────────────

/** A reference audio for voice cloning models (CosyVoice2 `references`). */
export interface HelixSpeechReference {
  /** A URL or `data:audio/...;base64,...` string of the reference audio */
  audio: string;
  /** The transcript of the reference audio (used by the model) */
  text?: string;
}

/** Payload for the `POST /v1/audio/speech` endpoint. */
export interface HelixSpeechGenerateOptions {
  /** Speech (TTS) model id (e.g. "fishaudio/fish-speech-1.5") */
  model: string;
  /** The text to generate audio for (1..128000 chars) */
  input: string;
  /**
   * Voice to use. Either a built-in `"<model>:<voice>"` (e.g.
   * "fishaudio/fish-speech-1.5:alex") or a user-defined `"speech:..."` URI
   * returned by `listVoices()`.
   */
  voice?: string;
  /** Audio output format (default: "mp3") */
  response_format?: HelixSpeechResponseFormat;
  /** Output sample rate (defaults vary by format) */
  sample_rate?: HelixSpeechSampleRate;
  /** Playback speed from 0.25 to 4.0 (default: 1.0) */
  speed?: number;
  /** Gain in dB from -10 to 10 (default: 0) */
  gain?: number;
  /** Streaming or not (default: true) */
  stream?: boolean;
  /** Reference audios for voice-cloning models (mutually exclusive with voice) */
  references?: HelixSpeechReference[];
}

/** A user-defined custom voice returned by `GET /v1/audio/voice/list`. */
export interface HelixSpeechVoice {
  /** Predefined voice style model name (e.g. "fishaudio/fish-speech-1.4") */
  model: string;
  /** User-defined voice style name (e.g. "my-voice") */
  customName: string;
  /** The transcript of the uploaded reference audio */
  text: string;
  /** URI usable as the `voice` field (e.g. "speech:my-voice:xxx:xxx") */
  uri: string;
}

/** Options accepted by the adapter constructor (BYOK overrides). */
export interface HelixSiliconFlowSpeechAdapterOptions {
  apiKey?: string;
  baseUrl?: string;
}

/**
 * Contract for Helix speech adapters. Any provider that exposes a text-to-
 * speech API plus (optionally) a custom-voice listing API can implement this
 * interface; consumers only depend on the abstraction.
 */
export interface HelixSpeechAdapter {
  /** Generate speech audio from text and return it as a raw Blob. */
  generateSpeech(
    options: HelixSpeechGenerateOptions,
  ): Promise<Blob>;
  /** List user-defined custom voices available on the account (empty when none). */
  listVoices(): Promise<HelixSpeechVoice[]>;
  /**
   * Transcribe an audio file to text via the provider's OpenAI-compatible
   * `/audio/transcriptions` endpoint. Returns the plain transcribed text.
   */
  transcribeAudio(option: {
    /** The audio file/blob to transcribe */
    file: File | Blob;
    /** Transcription (STT) model id (e.g. "FunAudioLLM/SenseVoiceSmall") */
    model?: string;
    /** Optional BCP-47 language hint (e.g. "en", "zh") */
    language?: string;
  }): Promise<string>;
}

// ── Adapter ───────────────────────────────────────────────────────────────────

const DEFAULT_BASE_URL = "https://api.siliconflow.com/v1";

/** Map a MIME type to the audio format token accepted by Omni `input_audio`. */
function mimeToAudioFormat(mime: string): string {
  const m = (mime || "").toLowerCase();
  if (m.includes("wav") || m.includes("wave")) return "wav";
  if (m.includes("mp3") || m.includes("mpeg") || m.includes("mpga")) return "mp3";
  if (m.includes("flac")) return "flac";
  if (m.includes("aac")) return "aac";
  if (m.includes("m4a") || m.includes("mp4")) return "m4a";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("webm")) return "webm";
  return "wav";
}

export class HelixSiliconFlowSpeechAdapter implements HelixSpeechAdapter {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: HelixSiliconFlowSpeechAdapterOptions = {}) {
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
        '[HelixSiliconFlowSpeechAdapter] No valid API key configured for provider "siliconFlow". ' +
          "Set SILICON_FLOW_API_KEY in your environment or pass an apiKey override.",
      );
    }
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, init);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `[HelixSiliconFlowSpeechAdapter] ${init?.method ?? "GET"} ${path} failed ` +
          `(${res.status}): ${text || res.statusText}`,
      );
    }
    return (await res.json()) as T;
  }

  /**
   * Generate speech audio from text. The response is raw binary audio data,
   * returned as a Blob — the caller decides how to encode/persist it (the API
   * route re-encodes it to a self-contained base64 data URL for the app).
   */
  public async generateSpeech(
    options: HelixSpeechGenerateOptions,
  ): Promise<Blob> {
    this.assertApiKey();

    const input = options.input?.trim();
    if (!input) {
      throw new Error(
        "[HelixSiliconFlowSpeechAdapter] A non-empty text input is required to generate speech.",
      );
    }

    const body: Record<string, unknown> = {
      model: options.model,
      input,
    };
    if (options.voice) body.voice = options.voice;
    if (options.response_format) body.response_format = options.response_format;
    if (options.sample_rate) body.sample_rate = options.sample_rate;
    if (options.speed !== undefined) body.speed = options.speed;
    if (options.gain !== undefined) body.gain = options.gain;
    if (options.stream !== undefined) body.stream = options.stream;
    if (options.references?.length) body.references = options.references;

    const res = await fetch(`${this.baseUrl}/audio/speech`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `[HelixSiliconFlowSpeechAdapter] POST /audio/speech failed (${res.status}): ` +
          (text || res.statusText),
      );
    }

    return await res.blob();
  }

  /** List user-defined custom voices uploaded to the account. */
  public async listVoices(): Promise<HelixSpeechVoice[]> {
    this.assertApiKey();
    const data = await this.request<{ results?: HelixSpeechVoice[] }>(
      "/audio/voice/list",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      },
    );
    return data.results ?? [];
  }

  /**
   * Transcribe an audio file to text, routed through the same base URL + API
   * key resolution as speech generation.
   *
   * SiliconFlow routes speech processing through Omni multimodal models on
   * `/chat/completions` (base64 `input_audio` content parts) — its standalone
   * ASR models (FunAudioLLM/SenseVoiceSmall, TeleAI/TeleSpeechASR) have been
   * rotated offline. Omni models use the chat-completions path; any other model
   * falls back to the native `POST /audio/transcriptions` (multipart) endpoint.
   *
   * NOTE: SiliconFlow error bodies use `{ code, message }` rather than the
   * OpenAI `{ error: { message } }` shape, so we call the endpoints directly
   * with fetch and surface the raw server message — otherwise the underlying
   * reason would be hidden.
   */
  public async transcribeAudio(option: {
    file: File | Blob;
    model?: string;
    language?: string;
  }): Promise<string> {
    this.assertApiKey();
    const model = option.model || "Qwen/Qwen3-Omni-30B-A3B-Instruct";

    if (isOmniTranscriptionModel(model)) {
      return this.transcribeViaChatCompletions({
        file: option.file,
        model,
        language: option.language,
      });
    }

    return this.transcribeViaNativeEndpoint({
      file: option.file,
      model,
      language: option.language,
    });
  }

  /** Transcribe via `/chat/completions` using base64 `input_audio` (Omni models). */
  private async transcribeViaChatCompletions(option: {
    file: File | Blob;
    model: string;
    language?: string;
  }): Promise<string> {
    const data = await this.blobToBase64(option.file);
    const format = mimeToAudioFormat(option.file.type);

    const prompt = option.language
      ? `Transcribe this audio verbatim. Output only the transcribed text (language: ${option.language}).`
      : "Transcribe this audio verbatim. Output only the transcribed text.";

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: option.model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "input_audio",
                input_audio: { data, format },
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      throw await this.buildHttpError("/chat/completions", res);
    }

    const parsed = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return parsed.choices?.[0]?.message?.content ?? "";
  }

  /** Transcribe via the native `POST /audio/transcriptions` multipart endpoint. */
  private async transcribeViaNativeEndpoint(option: {
    file: File | Blob;
    model: string;
    language?: string;
  }): Promise<string> {
    const form = new FormData();
    form.append("file", option.file);
    form.append("model", option.model);
    if (option.language) form.append("language", option.language);

    const res = await fetch(`${this.baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}` },
      // Leave Content-Type unset so the boundary is generated automatically.
      body: form,
    });

    if (!res.ok) {
      throw await this.buildHttpError("/audio/transcriptions", res);
    }

    const data = (await res.json()) as { text?: string };
    return data.text ?? "";
  }

  /** Convert a File/Blob to a base64 string (Node Buffer when available). */
  private async blobToBase64(file: File | Blob): Promise<string> {
    const buf = await file.arrayBuffer();
    if (typeof Buffer !== "undefined") {
      return Buffer.from(buf).toString("base64");
    }
    const bytes = new Uint8Array(buf);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  /** Build a descriptive error from a non-OK response, surfacing SiliconFlow's
   *  `{ code, message }` body when present. */
  private async buildHttpError(path: string, res: Response): Promise<Error> {
    const text = await res.text().catch(() => "");
    let detail = text || res.statusText;
    try {
      const parsed = JSON.parse(text) as { message?: string };
      if (parsed?.message) detail = parsed.message;
    } catch {
      /* keep the raw body text */
    }
    return new Error(
      `[HelixSiliconFlowSpeechAdapter] POST ${path} failed (${res.status}): ${detail}`,
    );
  }
}
