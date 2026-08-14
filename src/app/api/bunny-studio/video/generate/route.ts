// route.ts — Bunny AI Studio video generation endpoint
//
// Receives a JSON prompt + Helix video settings, resolves the provider from
// the Helix provider table (HELIX_AI_PROVIDERS), and generates a video through
// the provider's async submit → poll → download flow via the Helix video
// adapter (HelixSiliconFlowVideoAdapter).
//
// Supports:
//  - BYOK: an optional `apiKey` field uses the client-supplied key, otherwise
//    the server-configured env key for the resolved provider.
//  - The rendered video is downloaded server-side and re-encoded to a
//    self-contained `data:video/...;base64,...` URL so the client can persist
//    it offline (SiliconFlow result URLs are only valid for ~10 minutes).
//  - `image` (base64 data URL) is passed through for image-to-video models.
//
// Only providers with video-capable models (HELIX_PROVIDER_VIDEO_MODELS) are
// considered; anything else falls back to the default video provider.

import { HELIX_PROVIDER_VIDEO_MODELS, isHelixVideoProvider } from "@/src/modules/helix";
import { HelixSiliconFlowVideoAdapter } from "@/src/modules/helix";
import type { HelixAIProvider, HelixVideoSize } from "@/src/modules/helix";
import {
  BS_API_TOKEN_HEADER,
  BS_API_TOKEN_ENV,
} from "@/src/modules/bunny-studio/src/BSApiSecurity";

// ─── Frontend-only access guard (defense-in-depth) ─────────────────────
// Mirrors the chat stream / image generate routes so the endpoint stays
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
      image?: string;
      apiKey?: string;
    };

    const prompt = (body.prompt ?? "").trim();
    if (!prompt) {
      return jsonResponse({ error: "A prompt is required." }, 400);
    }

    // Resolve a video-capable provider. If the requested provider has no
    // video models, fall back to the first video-capable provider.
    const requested = (body.provider as HelixAIProvider | undefined) ?? "";
    const providers = (
      Object.keys(HELIX_PROVIDER_VIDEO_MODELS) as HelixAIProvider[]
    ).filter((p) => p !== "default");

    let providerKey: HelixAIProvider = isHelixVideoProvider(requested)
      ? requested
      : (providers[0] ?? "siliconFlow");
    if (!isHelixVideoProvider(providerKey)) {
      providerKey = "siliconFlow";
    }

    // Effective model — must belong to the provider's video model list.
    const providerModels = HELIX_PROVIDER_VIDEO_MODELS[providerKey] ?? [];
    const model =
      (body.model && providerModels.includes(body.model) ? body.model : null) ??
      providerModels[0];
    if (!model) {
      return jsonResponse(
        { error: `No video models configured for provider "${providerKey}".` },
        400,
      );
    }

    const size = (body.size as HelixVideoSize) || "1280x720";

    const adapter = new HelixSiliconFlowVideoAdapter({
      apiKey: body.apiKey?.trim() || undefined,
    });

    // The adapter submits the job, polls until it renders, downloads the
    // video, and returns it as a Blob. We then re-encode it to a self-contained
    // base64 data URL so the client can persist / play / download it offline.
    const blob = await adapter.generateVideo({
      model,
      prompt,
      image_size: size,
      ...(body.image ? { image: body.image } : {}),
    });

    const buffer = Buffer.from(await blob.arrayBuffer());
    const mime =
      (blob.type || "video/mp4").split(";")[0].trim() || "video/mp4";

    return jsonResponse({
      videos: [{ url: `data:${mime};base64,${buffer.toString("base64")}` }],
      provider: providerKey,
      model,
      size,
      prompt,
    });
  } catch (error) {
    console.error("[BS Video Generate] Error:", error);
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Video generation failed.",
      },
      500,
    );
  }
}
