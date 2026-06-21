/**
 * AI Config Utilities for BunnyFlow.
 *
 * Provides a central utility to retrieve the active AI provider + model
 * at any level.  If no active config exists, one is auto-created using
 * the default Helix provider and model.
 */

import type { HelixAIProvider, HelixAIOption } from "@/src/modules/helix";
import { HELIX_AI_PROVIDERS } from "@/src/modules/helix";
import { bflowDB } from "../database/BFlowDatabase";
import { BFlowAIConfigResolver } from "./BFlowAIConfig.Repository";

export class BFlowAIConfigUtil {
  /**
   * Get the active AI configuration for a specific context.
   *
   * Resolution order (highest priority first):
   *   1. Pipeline-level active config
   *   2. Flow-level active config
   *   3. Global active config
   *
   * If no active config exists at any level, a default global config is
   * auto-created using the first Helix provider that has a valid API key,
   * or falls back to "default" provider with "default" model.
   *
   * @param context - Optional context to scope the query
   * @returns The resolved HelixAIOption (provider + model)
   */
  static async getActiveAIConfig(
    context?: {
      pipelineId?: string;
      flowId?: string;
    },
  ): Promise<HelixAIOption> {
    const resolver = new BFlowAIConfigResolver(
      bflowDB.globalAIConfigRepo,
      bflowDB.flowAIConfigRepo,
      bflowDB.pipelineAIConfigRepo,
    );

    const resolved = await resolver.resolve({
      pipelineId: context?.pipelineId,
      flowId: context?.flowId,
    });

    return {
      provider: resolved.provider,
      model: resolved.model,
    };
  }

  /**
   * Ensures a global AI config exists by creating a default one if none is active.
   * Returns the active (or newly-created) global config.
   */
  static async ensureActiveGlobalAIConfig(): Promise<{
    provider: HelixAIProvider;
    model: string;
  }> {
    const existing = await bflowDB.globalAIConfigRepo.getActive();

    // If an active config already exists, return it
    if (existing && existing.active !== false) {
      return {
        provider: existing.provider as HelixAIProvider,
        model: existing.model,
      };
    }

    // Find the first Helix provider with a valid API key
    const validProvider = HELIX_AI_PROVIDERS.find(
      (p) => p.apiKey && p.apiKey !== "" && p.apiKey !== "[ENCRYPTION_KEY]",
    );

    const defaultProvider = validProvider?.provider ?? "default";
    const defaultModel = validProvider?.model ?? "default";

    // Create the global config record
    await bflowDB.globalAIConfigRepo.upsert({
      provider: defaultProvider,
      model: defaultModel,
      active: true,
    });

    return {
      provider: defaultProvider as HelixAIProvider,
      model: defaultModel,
    };
  }
}
