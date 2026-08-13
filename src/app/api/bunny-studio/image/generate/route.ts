// route.ts — Bunny AI Studio image generation endpoint
//
// Receives a JSON prompt + Helix image settings, resolves the provider from
// the Helix provider table (HELIX_AI_PROVIDERS), and generates an image via an
// OpenAI-compatible `/images/generations` endpoint using the `openai` SDK.
//
// Supports:
//  - BYOK: an optional `apiKey` field uses the client-supplied key, otherwise
//    the server-configured env key for the resolved provider.
//  - `response_format: "b64_json"` (falling back to a URL when a provider does
//    not return base64) so the client can persist the image offline.
//
// Only providers with image-capable models (HELIX_PROVIDER_IMAGE_MODELS) are
// considered; anything else falls back to the default image provider.

import OpenAI from "openai";
import {
  HELIX_AI_PROVIDERS,
  HELIX_PROVIDER_IMAGE_MODELS,
  isHelixImageProvider,
} from "@/src/modules/helix";
import type { HelixAIProvider } from "@/src/modules/helix";
import {
  BS_API_TOKEN_HEADER,
  BS_API_TOKEN_ENV,
} from "@/src/modules/bunny-studio/src/BSApiSecurity";

// ─── Frontend-only access guard (defense-in-depth) ─────────────────────
// Mirrors the chat stream/transcribe routes so the endpoint stays protected
// even if the proxy is bypassed.

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
    const body = (await req.json()) as {
      prompt?: string;
      provider?: string;
      model?: string;
      size?: string;
      n?: number;
      apiKey?: string;
    };

    const prompt = (body.prompt ?? "").trim();
    if (!prompt) {
      return jsonResponse({ error: "A prompt is required." }, 400);
    }

    // Resolve an image-capable provider. If the requested provider has no
    // image models, fall back to the first image-capable provider.
    const requested = (body.provider as HelixAIProvider | undefined) ?? "";
    const providers = (
      Object.keys(HELIX_PROVIDER_IMAGE_MODELS) as HelixAIProvider[]
    ).filter((p) => p !== "default");

    let providerKey: HelixAIProvider = isHelixImageProvider(requested)
      ? requested
      : (providers[0] ?? "siliconFlow");
    if (!isHelixImageProvider(providerKey)) {
      providerKey = "siliconFlow";
    }

    // Effective model — must belong to the provider's image model list.
    const providerModels = HELIX_PROVIDER_IMAGE_MODELS[providerKey] ?? [];
    const model =
      (body.model && providerModels.includes(body.model) ? body.model : null) ??
      providerModels[0];
    if (!model) {
      return jsonResponse(
        { error: `No image models configured for provider "${providerKey}".` },
        400,
      );
    }

    const config = HELIX_AI_PROVIDERS.find((p) => p.provider === providerKey);
    const apiKey =
      body.apiKey?.trim() || config?.apiKey || "not-needed";
    const baseURL = config?.endpoint || "https://api.openai.com/v1";
    const size = body.size || "1024x1024";
    const n = Math.min(Math.max(body.n ?? 1, 1), 4);

    const client = new OpenAI({ apiKey, baseURL });

    // OpenAI-compatible image generation. `response_format: "b64_json"` keeps
    // the payload self-contained so the client can store it offline.
    const response = await client.images.generate({
      model,
      prompt,
      n,
      size,
      response_format: "b64_json",
    });

    // Normalize every generated image to a self-contained base64 data URL so
    // the client can persist it offline. Some providers (e.g. SiliconFlow) do
    // NOT honor `response_format` and return a temporary S3 URL instead — we
    // download that URL server-side and re-encode it, avoiding CORS issues in
    // the browser and the 24h signed-URL expiry.
    const images: Array<{
      url: string;
      b64_json: string;
      revised_prompt?: string;
    }> = [];
    for (const item of response.data ?? []) {
      const b64 = item.b64_json ?? "";
      const revised_prompt = item.revised_prompt;

      if (b64) {
        images.push({
          url: `data:image/png;base64,${b64}`,
          b64_json: b64,
          revised_prompt,
        });
        continue;
      }

      if (!item.url) continue;
      try {
        const download = await fetch(item.url);
        if (!download.ok) {
          // Fallback: keep the remote URL (still renderable while it lives).
          images.push({ url: item.url, b64_json: "", revised_prompt });
          continue;
        }
        const buffer = Buffer.from(await download.arrayBuffer());
        const mime =
          (download.headers.get("content-type") ?? "image/png")
            .split(";")[0]
            .trim() || "image/png";
        const base64 = buffer.toString("base64");
        images.push({
          url: `data:${mime};base64,${base64}`,
          b64_json: base64,
          revised_prompt,
        });
      } catch (downloadErr) {
        console.warn(
          "[BS Image Generate] Failed to download image URL:",
          downloadErr,
        );
        images.push({ url: item.url, b64_json: "", revised_prompt });
      }
    }

    return jsonResponse({
      images,
      provider: providerKey,
      model,
      size,
      prompt,
    });
  } catch (error) {
    console.error("[BS Image Generate] Error:", error);
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Image generation failed.",
      },
      500,
    );
  }
}
