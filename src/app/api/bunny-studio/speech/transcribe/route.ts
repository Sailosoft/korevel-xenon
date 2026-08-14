// route.ts — Bunny AI Studio speech transcription (STT) endpoint
//
// Receives an audio file as multipart FormData, resolves the provider from the
// Helix provider table (HELIX_AI_PROVIDERS), and transcribes it via the Helix
// speech adapter (HelixSiliconFlowSpeechAdapter → OpenAI-compatible
// `/audio/transcriptions`).
//
// Supports:
//  - BYOK: an optional `apiKey` field uses the client-supplied key, otherwise
//    the server-configured env key for the resolved provider.
//  - Transcription (STT) models are validated against
//    HELIX_PROVIDER_TRANSCRIPTION_MODELS (e.g. FunAudioLLM/SenseVoiceSmall,
//    TeleAI/TeleSpeechASR).
//  - An optional BCP-47 `language` hint improves recognition accuracy.

import { HelixSiliconFlowSpeechAdapter } from "@/src/modules/helix";
import {
  HELIX_PROVIDER_TRANSCRIPTION_MODELS,
} from "@/src/modules/helix";
import type { HelixAIProvider } from "@/src/modules/helix";
import {
  BS_API_TOKEN_HEADER,
  BS_API_TOKEN_ENV,
} from "@/src/modules/bunny-studio/src/BSApiSecurity";

// ─── Frontend-only access guard (defense-in-depth) ─────────────────────
// Mirrors the chat transcribe route so the endpoint stays protected even if
// the proxy is bypassed.

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

// ─── Route handler ──────────────────────────────────────────────────────

export async function POST(req: Request) {
  const denied = assertFrontendOnly(req);
  if (denied) return denied;

  try {
    const form = await req.formData();

    const file = form.get("file");
    if (!(file instanceof File)) {
      return jsonResponse({ error: "Missing audio file." }, 400);
    }

    const requested = (form.get("provider") as string) || "";
    const model = (form.get("model") as string) || "";
    const language = (form.get("language") as string) || undefined;
    const byok = (form.get("apiKey") as string) || undefined;

    // Resolve a transcription-capable provider. If the requested provider has
    // no transcription models, fall back to the first transcription provider.
    const providers = (
      Object.keys(HELIX_PROVIDER_TRANSCRIPTION_MODELS) as HelixAIProvider[]
    ).filter((p) => p !== "default");
    const providerKey: HelixAIProvider =
      (requested && (HELIX_PROVIDER_TRANSCRIPTION_MODELS as Record<string, readonly string[]>)[requested]
        ? (requested as HelixAIProvider)
        : (providers[0] ?? "siliconFlow"));

    // Effective model — must belong to the provider's transcription model list.
    // providerKey is guaranteed to be a non-"default" transcription provider.
    const providerModels =
      HELIX_PROVIDER_TRANSCRIPTION_MODELS[
        providerKey as Exclude<HelixAIProvider, "default">
      ] ?? [];
    const effectiveModel =
      (model && providerModels.includes(model) ? model : null) ??
      providerModels[0];
    if (!effectiveModel) {
      return jsonResponse(
        { error: `No transcription models configured for provider "${providerKey}".` },
        400,
      );
    }

    const adapter = new HelixSiliconFlowSpeechAdapter({
      apiKey: byok?.trim() || undefined,
    });

    const text = await adapter.transcribeAudio({
      file,
      model: effectiveModel,
      ...(language ? { language } : {}),
    });

    return jsonResponse({ text, provider: providerKey, model: effectiveModel });
  } catch (error) {
    console.error("[BS Speech Transcribe] Error:", error);
    return jsonResponse(
      {
        error:
          error instanceof Error ? error.message : "Transcription failed.",
      },
      500,
    );
  }
}
