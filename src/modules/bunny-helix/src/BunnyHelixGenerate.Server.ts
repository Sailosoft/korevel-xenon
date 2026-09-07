/**
 * BunnyHelixGenerate.Server — Generic `"use server"` action that calls Helix's
 * structured-output generation.
 *
 * This mirrors the `resolveHelixService` pattern from
 * `bunny-studio/src/modules/agents/BSAgentGenerate.Server.ts`: it rehydrates a
 * provider list from `HELIX_AI_PROVIDERS`, applies a model override onto the
 * active provider, and drives `HelixAIService` + `HelixAISchemaService`.
 *
 * Helix is imported via deep paths (not the `helix` index) to avoid pulling
 * client components/hooks into the server bundle. Failures are re-wrapped into
 * a clean `Error` message so no API keys or raw stack details leak to the UI.
 */
"use server";

import HelixAIService from "@/src/modules/helix/src/HelixAIService";
import HelixAISchemaService from "@/src/modules/helix/src/HelixAISchemaService";
import {
  HELIX_AI_PROVIDERS,
  type HelixAIConfig,
  type HelixAIOption,
  type HelixAIProvider,
} from "@/src/modules/helix/src/HelixConfig";
import type { HelixAISchemaOptions } from "@/src/modules/helix/src/HelixAISchemaTypes";
import type { BunnyHelixGenerateParams } from "./BunnyHelix.Interface";

// ── Internal service resolution (mirrors BSAgentGenerate.Server) ────────────

function resolveHelixService(aiConfig?: HelixAIOption): HelixAIService {
  const activeProvider = (aiConfig?.provider || "default") as HelixAIProvider;
  const modelOverride = aiConfig?.model;

  const providers = HELIX_AI_PROVIDERS.map((p) => {
    if (p.provider === activeProvider && modelOverride) {
      return { ...p, model: modelOverride };
    }
    return p;
  });

  const helixConfig: HelixAIConfig = {
    activeProvider,
    providers,
  };

  return new HelixAIService({
    config: { ai: helixConfig },
    aiSchema: new HelixAISchemaService(),
  });
}

/**
 * Generic AI record-field generation action.
 *
 * @param params - Schema, prompts, optional provider/model override, and
 *                 optional temperature settings.
 * @returns A flat record of generated field values.
 * @throws A clean `Error` when the AI call fails or returns invalid output.
 */
export async function bunnyHelixGenerate(
  params: BunnyHelixGenerateParams,
): Promise<Record<string, unknown>> {
  const { schema, system, user, aiConfig, temperature, type } = params;

  try {
    const ai = resolveHelixService(aiConfig);

    const result = await ai.doChatStructuredFallback<HelixAISchemaOptions>({
      system,
      user,
      schema,
      temperature,
      type,
    });

    if (!result || typeof result !== "object") {
      throw new Error("AI returned an empty or invalid response. Please retry.");
    }

    return result as Record<string, unknown>;
  } catch (error) {
    console.error("[BunnyHelixGenerate.Server] Generation failed:", error);
    throw new Error(
      `AI generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
