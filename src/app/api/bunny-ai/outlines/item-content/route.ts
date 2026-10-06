// route.ts — Bunny AI outline item content endpoint
//
// Runs ONE Generation Mode content call and returns markdown. This exists
// because Next.js dispatches Server Actions one at a time per client, so the
// parallel writing pool cannot get true concurrency through the action
// dispatcher. Route Handlers are NOT serialized, so the client can run several
// of these concurrently (3 at a time).

import { runItemContent } from "@/src/modules/bunny-ai/src/modules/outlines/bui.outline-chapter.ai.server";
import type { BUIOutlineParams } from "@/src/modules/bunny-ai/src/modules/outlines/bui.outline.entity";
import type { HelixAIOption } from "@/src/modules/helix";

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      params?: BUIOutlineParams;
      generationType?: string;
      generationMode?: string;
      aiConfig?: HelixAIOption;
    };

    if (!body?.params) {
      return jsonResponse({ error: "params is required." }, 400);
    }

    const content = await runItemContent(
      body.params,
      body.generationType || "guide",
      body.generationMode || "sequential",
      body.aiConfig,
    );

    return jsonResponse({ success: true, content });
  } catch (error) {
    console.error("[BUI Outline Content] Error:", error);
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate item content with AI.",
      },
      500,
    );
  }
}
