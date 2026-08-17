// route.ts — Bunny AI Studio Knowledge Base embedding endpoint
//
// Generates vector embeddings for the Knowledge Base RAG pipeline using the
// SiliconFlow OpenAI-compatible `/v1/embeddings` endpoint (feature:
// BSEmbeddings). The provider API key stays server-side; the client only ever
// sees the resulting vectors.
//
// Default model: Qwen/Qwen3-Embedding-0.6B (feature: BSKnowledgeBase).

import {
  BS_API_TOKEN_HEADER,
  BS_API_TOKEN_ENV,
} from "@/src/modules/bunny-studio/src/BSApiSecurity";

/** Default embedding model — cheapest / fastest SiliconFlow Qwen3 embedding. */
const DEFAULT_EMBEDDING_MODEL = "Qwen/Qwen3-Embedding-0.6B";
/** Output dimension requested — matches the default for the 0.6B model. */
const EMBEDDING_DIMENSIONS = 1024;
const SILICON_FLOW_EMBEDDINGS_ENDPOINT = "https://api.siliconflow.com/v1/embeddings";

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

interface EmbeddingsResponse {
  data: Array<{ embedding: number[] }>;
}

export async function POST(req: Request) {
  const denied = assertFrontendOnly(req);
  if (denied) return denied;

  try {
    const body = (await req.json()) as {
      inputs?: unknown;
      model?: string;
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

    const apiKey = process.env.SILICON_FLOW_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "SILICON_FLOW_API_KEY is not configured on the server.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const model = typeof body.model === "string" && body.model ? body.model : DEFAULT_EMBEDDING_MODEL;

    const upstream = await fetch(SILICON_FLOW_EMBEDDINGS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: inputs,
        encoding_format: "float",
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    });

    if (!upstream.ok) {
      const raw = await upstream.text();
      console.error("[BS Knowledge Embed] Upstream error:", upstream.status, raw);
      return new Response(
        JSON.stringify({
          error: `Embedding provider error (${upstream.status}).`,
        }),
        { status: upstream.status, headers: { "Content-Type": "application/json" } },
      );
    }

    const data = (await upstream.json()) as EmbeddingsResponse;
    const embeddings = (data.data ?? []).map((d) => d.embedding);

    return new Response(
      JSON.stringify({
        embeddings,
        model,
        dimensions: EMBEDDING_DIMENSIONS,
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
