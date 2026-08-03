// route.ts — Bunny AI Studio streaming chat endpoint
//
// Uses the Vercel AI SDK (v7) with BYOK (Bring Your Own Key) for streaming.
// The client sends the resolved provider/model (and optionally a BYO API key);
// the route builds an OpenAI-compatible provider and streams text back.
//
// Unlike server-action-based AI calls, this endpoint streams tokens to the
// client as they are generated.

import { streamText, createTextStreamResponse } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { HELIX_AI_PROVIDERS } from "@/src/modules/helix";
import type { BSChatStreamRequest, BSChatWireMessage } from "@/src/modules/bunny-studio/src/modules/chat/BSChat.Types";
import {
  BS_API_TOKEN_HEADER,
  BS_API_TOKEN_ENV,
} from "@/src/modules/bunny-studio/src/BSApiSecurity";

// ─── Frontend-only access guard (defense-in-depth) ─────────────────────
// `src/proxy.ts` already blocks non-frontend callers at the proxy layer; this
// re-validation keeps the endpoint protected even if the proxy is bypassed.

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

// ─── Resolve provider endpoint & env key ────────────────────────────────

interface ResolvedProvider {
  baseURL?: string;
  envKey?: string;
}

function resolveProvider(provider?: string): ResolvedProvider {
  const key = provider ?? "default";
  const config = HELIX_AI_PROVIDERS.find((p) => p.provider === key);
  if (!config) {
    return { baseURL: undefined, envKey: undefined };
  }
  return { baseURL: config.endpoint, envKey: config.apiKey };
}

// ─── Route handler ──────────────────────────────────────────────────────

export async function POST(req: Request) {
  const denied = assertFrontendOnly(req);
  if (denied) return denied;

  try {
    const body: BSChatStreamRequest = await req.json();
    const messages: BSChatWireMessage[] = body.messages ?? [];

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No messages provided." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const { baseURL, envKey } = resolveProvider(body.provider);

    // BYOK: use the client-provided API key if present, otherwise fall back
    // to the server-configured env key for the resolved provider.
    // The client may send apiKey via body.apiKey (not declared in type but
    // supported) — keep it optional so env keys are used by default.
    const apiKey =
      (body as { apiKey?: string }).apiKey?.trim() || envKey || "not-needed";

    // Build an OpenAI-compatible provider instance for this request.
    const provider = createOpenAICompatible({
      name: body.provider ?? "default",
      apiKey,
      baseURL: baseURL ?? "https://api.openai.com/v1",
    });

    const model = body.model || "gemma4:31b-cloud";

    // AI SDK v7 does not allow system messages inside `messages`; system
    // instructions must be provided through the dedicated `instructions` option.
    const systemMessages = messages.filter((m) => m.role === "system");
    const chatMessages = messages.filter((m) => m.role !== "system");

    const result = streamText({
      model: provider(model),
      messages: chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      instructions:
        systemMessages.length > 0
          ? systemMessages.map((m) => m.content).join("\n\n")
          : undefined,
      temperature: body.temperature ?? 0.7,
    });

    // Stream text tokens back as a plain text stream (text/plain; charset=utf-8).
    return createTextStreamResponse({
      stream: result.textStream,
    });
  } catch (error) {
    console.error("[BS Chat Stream] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Streaming failed.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
