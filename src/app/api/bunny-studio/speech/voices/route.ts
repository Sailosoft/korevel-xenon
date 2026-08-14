// route.ts — Bunny AI Studio speech voice-list endpoint
//
// Returns the user-defined custom voice styles available on the account via the
// provider's `/audio/voice/list` API. Built-in voices (the `<model>:<voice>`
// enums) come from the Helix speech config and are always offered; this endpoint
// supplements them with the custom `speech:...` URIs uploaded by the user.
//
// Supports BYOK via an optional `apiKey` query/header. When no API key resolves
// (e.g. provider not configured), it returns an empty list rather than failing,
// so the Speech Generator UI degrades gracefully.

import { HelixSiliconFlowSpeechAdapter } from "@/src/modules/helix";
import type { HelixSpeechVoice } from "@/src/modules/helix";
import {
  BS_API_TOKEN_HEADER,
  BS_API_TOKEN_ENV,
} from "@/src/modules/bunny-studio/src/BSApiSecurity";

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

export async function GET(req: Request) {
  const denied = assertFrontendOnly(req);
  if (denied) return denied;

  try {
    const url = new URL(req.url);
    const byok = url.searchParams.get("apiKey") || undefined;

    const adapter = new HelixSiliconFlowSpeechAdapter({
      apiKey: byok?.trim() || undefined,
    });

    const voices: HelixSpeechVoice[] = await adapter.listVoices();
    return jsonResponse({ voices });
  } catch (error) {
    console.warn("[BS Speech Voices] Failed to list custom voices:", error);
    // Degrade gracefully — built-in voices still work without custom voices.
    return jsonResponse({ voices: [] });
  }
}
