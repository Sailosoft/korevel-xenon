// route.ts — Bunny AI Studio speech-to-text (transcription) endpoint
//
// Receives an audio recording as multipart FormData, resolves the provider
// from the Helix provider table (HELIX_AI_PROVIDERS), and transcribes it via
// an OpenAI-compatible `/audio/transcriptions` endpoint using the `openai` SDK.
//
// Supports:
//  - BYOK: an optional `apiKey` field uses the client-supplied key, otherwise
//    the server-configured env key for the resolved provider.
//  - STT endpoint override: an optional `endpoint` field, otherwise the
//    provider's `sttEndpoint` (e.g. Ollama Cloud) then its chat `endpoint`.

import OpenAI from "openai";
import { HELIX_AI_PROVIDERS } from "@/src/modules/helix";
import {
  BS_API_TOKEN_HEADER,
  BS_API_TOKEN_ENV,
} from "@/src/modules/bunny-studio/src/BSApiSecurity";

// ─── Frontend-only access guard (defense-in-depth) ─────────────────────
// Mirrors the chat stream route so the endpoint stays protected even if the
// proxy is bypassed.

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

    const providerKey = (form.get("provider") as string) || "openai";
    const model = (form.get("model") as string) || "whisper-1";
    const language = (form.get("language") as string) || undefined;
    const endpoint = (form.get("endpoint") as string) || undefined;
    const byok = (form.get("apiKey") as string) || undefined;

    const config = HELIX_AI_PROVIDERS.find(
      (p) => p.provider === providerKey,
    );

    // STT endpoint priority: request override → provider sttEndpoint → chat endpoint.
    const baseURL =
      endpoint || config?.sttEndpoint || config?.endpoint ||
      "https://api.openai.com/v1";
    const apiKey =
      byok?.trim() || config?.apiKey || "not-needed";

    const client = new OpenAI({ apiKey, baseURL });

    const response = await client.audio.transcriptions.create({
      file,
      model,
      ...(language ? { language } : {}),
    });

    const text =
      typeof response === "string" ? response : (response.text ?? "");

    return jsonResponse({ text });
  } catch (error) {
    console.error("[BS Chat Transcribe] Error:", error);
    return jsonResponse(
      {
        error:
          error instanceof Error ? error.message : "Transcription failed.",
      },
      500,
    );
  }
}
