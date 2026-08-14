// route.ts — Bunny AI Studio speech (text-to-speech) endpoint
//
// Receives a JSON text input + Helix speech settings, resolves the provider
// from the Helix provider table (HELIX_AI_PROVIDERS), and generates speech
// audio through the provider's text-to-speech API via the Helix speech adapter
// (HelixSiliconFlowSpeechAdapter → POST /audio/speech).
//
// Supports:
//  - BYOK: an optional `apiKey` field uses the client-supplied key, otherwise
//    the server-configured env key for the resolved provider.
//  - Built-in voices are sent as `"<model>:<voice>"`; user-defined custom
//    voices (the `speech:...` URIs from /audio/voice/list) pass through as-is.
//  - The rendered audio is re-encoded to a self-contained `data:audio/...;base64,...`
//    URL so the client can play it inline and persist it offline.
//
// Only providers with speech-capable models (HELIX_PROVIDER_SPEECH_MODELS) are
// considered; anything else falls back to the default speech provider.

import { HELIX_PROVIDER_SPEECH_MODELS, isHelixSpeechProvider } from "@/src/modules/helix";
import { HelixSiliconFlowSpeechAdapter } from "@/src/modules/helix";
import type {
  HelixAIProvider,
  HelixSpeechResponseFormat,
  HelixSpeechSampleRate,
} from "@/src/modules/helix";
import {
  BS_API_TOKEN_HEADER,
  BS_API_TOKEN_ENV,
} from "@/src/modules/bunny-studio/src/BSApiSecurity";

// ─── Frontend-only access guard (defense-in-depth) ─────────────────────
// Mirrors the chat stream / video generate routes so the endpoint stays
// protected even if the proxy is bypassed.

function assertFrontendOnly(req: Request): Response | null {
  const expected = process.env[BS_API_TOKEN_ENV];
  if (!expected) return null; // no token configured → allow (local/dev mode)
  const supplied = req.headers.get(BS_API_TOKEN_HEADER);
  if (!supplied || supplied !== expected) {
    return new Response(
      JSON.stringify({ error: "Forbidden: missing or invalid frontend token." }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }
  return null;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Normalize the requested voice. Built-in voices are bare names (e.g. "alex")
 * that must be sent as `"<model>:<voice>"`. Anything already qualified — either
 * `"<model>:<voice>"` or a `"speech:..."` custom URI — passes through as-is.
 */
function resolveVoice(voice: string | undefined, model: string): string | undefined {
  if (!voice?.trim()) return undefined;
  const v = voice.trim();
  if (v.includes(":")) return v;
  return `${model}:${v}`;
}

// ─── Route handler ──────────────────────────────────────────────────────

export async function POST(req: Request) {
  const denied = assertFrontendOnly(req);
  if (denied) return denied;

  try {
    const body = (await req.json()) as {
      input?: string;
      provider?: string;
      model?: string;
      voice?: string;
      response_format?: string;
      sample_rate?: number;
      speed?: number;
      gain?: number;
      apiKey?: string;
    };

    const input = (body.input ?? "").trim();
    if (!input) {
      return jsonResponse({ error: "A text input is required." }, 400);
    }

    // Resolve a speech-capable provider. If the requested provider has no
    // speech models, fall back to the first speech-capable provider.
    const requested = (body.provider as HelixAIProvider | undefined) ?? "";
    const providers = (
      Object.keys(HELIX_PROVIDER_SPEECH_MODELS) as HelixAIProvider[]
    ).filter((p) => p !== "default");

    let providerKey: HelixAIProvider = isHelixSpeechProvider(requested)
      ? requested
      : (providers[0] ?? "siliconFlow");
    if (!isHelixSpeechProvider(providerKey)) {
      providerKey = "siliconFlow";
    }

    // Effective model — must belong to the provider's speech model list.
    const providerModels = HELIX_PROVIDER_SPEECH_MODELS[providerKey] ?? [];
    const model =
      (body.model && providerModels.includes(body.model) ? body.model : null) ??
      providerModels[0];
    if (!model) {
      return jsonResponse(
        { error: `No speech models configured for provider "${providerKey}".` },
        400,
      );
    }

    const response_format = (body.response_format as HelixSpeechResponseFormat) || "mp3";
    const sample_rate = body.sample_rate as HelixSpeechSampleRate | undefined;
    const voice = resolveVoice(body.voice, model);

    const adapter = new HelixSiliconFlowSpeechAdapter({
      apiKey: body.apiKey?.trim() || undefined,
    });

    // The adapter calls POST /audio/speech and returns the raw binary audio as
    // a Blob. We re-encode it to a self-contained base64 data URL so the client
    // can play it inline and persist it offline.
    const blob = await adapter.generateSpeech({
      model,
      input,
      ...(voice ? { voice } : {}),
      response_format,
      ...(sample_rate ? { sample_rate } : {}),
      ...(body.speed !== undefined ? { speed: body.speed } : {}),
      ...(body.gain !== undefined ? { gain: body.gain } : {}),
    });

    const buffer = Buffer.from(await blob.arrayBuffer());
    const mime =
      (blob.type || "audio/mpeg").split(";")[0].trim() || "audio/mpeg";

    return jsonResponse({
      speeches: [{ url: `data:${mime};base64,${buffer.toString("base64")}` }],
      provider: providerKey,
      model,
      voice: voice ?? "",
      response_format,
      sample_rate: sample_rate ?? null,
      input,
    });
  } catch (error) {
    console.error("[BS Speech Generate] Error:", error);
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Speech generation failed.",
      },
      500,
    );
  }
}
