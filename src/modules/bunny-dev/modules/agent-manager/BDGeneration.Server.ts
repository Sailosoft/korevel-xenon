"use server";

// BDGeneration.Server — the single Helix entry point for every BunnyDev
// subsystem's one-shot batch generation.
//
// Mirrors `BunnyHelixGenerate.Server`: it rehydrates the provider list from
// HELIX_AI_PROVIDERS, applies an optional provider/model override, and drives
// HelixAIService + HelixAISchemaService through the structured-output call with
// JSON repair. Server-side System/AI keys never reach the UI.

import HelixAIService from "@/src/modules/helix/src/HelixAIService";
import HelixAISchemaService from "@/src/modules/helix/src/HelixAISchemaService";
import {
  HELIX_AI_PROVIDERS,
  type HelixAIConfig,
  type HelixAIProvider,
} from "@/src/modules/helix/src/HelixConfig";
import type { HelixAISchemaOptions } from "@/src/modules/helix/src/HelixAISchemaTypes";

export interface BDAIConfigOverride {
  provider?: string;
  model?: string;
}

export interface BDStructuredGenerateParams {
  system: string;
  user: string;
  schema: HelixAISchemaOptions;
  aiConfig?: BDAIConfigOverride;
  temperature?: number;
  /** Max output tokens. Defaults to Helix's 8000 when omitted. */
  maxToken?: number;
}

function resolveHelixService(aiConfig?: BDAIConfigOverride): HelixAIService {
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
    providers: providers.length > 0 ? providers : HELIX_AI_PROVIDERS,
  };

  return new HelixAIService({
    config: { ai: helixConfig },
    aiSchema: new HelixAISchemaService(),
  });
}

/**
 * Run a structured (JSON) generation through Helix.
 *
 * @throws A clean `Error` when the AI call fails or returns invalid output.
 */
export async function bdGenerateStructured(
  params: BDStructuredGenerateParams,
): Promise<Record<string, unknown>> {
  const { system, user, schema, aiConfig, temperature, maxToken } = params;

  try {
    const ai = resolveHelixService(aiConfig);
    const result = await ai.doChatStructuredFallback<HelixAISchemaOptions>({
      system,
      user,
      schema,
      temperature,
      maxToken,
    });

    if (!result || typeof result !== "object") {
      throw new Error("AI returned an empty or invalid response. Please retry.");
    }

    return result as Record<string, unknown>;
  } catch (error) {
    console.error("[BDGeneration.Server] Generation failed:", error);
    throw new Error(
      `AI generation failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}
