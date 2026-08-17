// route.ts — Bunny AI Studio Knowledge Base embedding endpoint
//
// Generates vector embeddings for the Knowledge Base RAG pipeline. The actual
// provider call (SiliconFlow by default, DeepInfra also supported) now lives in
// Helix (HelixEmbedding.generateEmbeddings); this route is a thin handler that
// validates the frontend-only token and the request payload, then delegates.
// The provider API key stays server-side; the client only ever sees the
// resulting vectors (feature: BSEmbeddings / BSKnowledgeBase).

import { generateEmbeddings } from "@/src/modules/helix";
import type {
  HelixEmbeddingProvider,
} from "@/src/modules/helix";
import {
  BS_API_TOKEN_HEADER,
  BS_API_TOKEN_ENV,
} from "@/src/modules/bunny-studio/src/BSApiSecurity";

// ─── Frontend-only access guard (same as the chat stream route) ─────────

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

export async function POST(req: Request) {
  const denied = assertFrontendOnly(req);
  if (denied) return denied;

  try {
    const body = (await req.json()) as {
      inputs?: unknown;
      model?: string;
      provider?: string;
    };

    const inputs = Array.isArray(body.inputs) ? body.inputs : [];
    if (inputs.length === 0 || inputs.length > 32) {
      return new Response(
        JSON.stringify({
          error: "Provide 1–32 input strings to embed.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    if (inputs.some((i) => typeof i !== "string" || !i.trim())) {
      return new Response(
        JSON.stringify({ error: "Every input must be a non-empty string." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const data = await generateEmbeddings({
      inputs: inputs as string[],
      model: typeof body.model === "string" && body.model ? body.model : undefined,
      provider: (body.provider as HelixEmbeddingProvider | undefined) ?? undefined,
    });

    return new Response(
      JSON.stringify({
        embeddings: data.embeddings,
        model: data.model,
        dimensions: data.dimensions,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[BS Knowledge Embed] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Embedding failed.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
