/**
 * Helix AI Integration for BunnyFlow.
 *
 * Provides a factory to create HelixAIService instances that are
 * configured using the resolved AI config (global → flow → pipeline).
 *
 * Usage:
 * ```ts
 * import { createHelixFromBFlow } from "./ai-config/BFlowHelixIntegration";
 *
 * const helix = await createHelixFromBFlow({
 *   pipelineId: "abc",
 *   flowId: "def",
 * });
 *
 * const result = await helix.doChat({ system: "...", user: "..." });
 * ```
 */

import HelixAIService from "@/src/modules/helix/src/HelixAIService";
import HelixAISchemaService from "@/src/modules/helix/src/HelixAISchemaService";
import {
  HELIX_AI_PROVIDERS,
  type HelixAIConfig,
  type HelixAIOption,
} from "@/src/modules/helix";
import { bflowDB } from "../database/BFlowDatabase";
import { BFlowAIConfigResolver } from "./BFlowAIConfig.Repository";

/**
 * Resolve the effective AI config from BunnyFlow's hierarchical config
 * and create a properly configured HelixAIService instance.
 */
export async function createHelixFromBFlow(context: {
  pipelineId?: string;
  flowId?: string;
}): Promise<HelixAIService> {
  const resolver = new BFlowAIConfigResolver(
    bflowDB.globalAIConfigRepo,
    bflowDB.flowAIConfigRepo,
    bflowDB.pipelineAIConfigRepo,
  );

  const resolved = await resolver.resolve(context);

  // Build a HelixAIConfig using the resolved provider + model
  const helixConfig: HelixAIConfig = {
    activeProvider: resolved.provider,
    providers: HELIX_AI_PROVIDERS.map((p) => {
      // If this is the resolved provider, override the model
      if (p.provider === resolved.provider) {
        return { ...p, model: resolved.model };
      }
      return p;
    }),
  };

  return new HelixAIService({
    config: { ai: helixConfig },
    aiSchema: new HelixAISchemaService(),
  });
}

/**
 * Resolve the effective AI config as a HelixAIOption DTO.
 * Useful when you need to pass aiConfig to an existing HelixAIService
 * instance rather than creating a new one.
 */
export async function resolveBFlowAIOption(context: {
  pipelineId?: string;
  flowId?: string;
  jobName?: string;
}): Promise<HelixAIOption> {
  const resolver = new BFlowAIConfigResolver(
    bflowDB.globalAIConfigRepo,
    bflowDB.flowAIConfigRepo,
    bflowDB.pipelineAIConfigRepo,
  );

  const resolved = context.jobName
    ? await resolver.resolveForJob(
        { pipelineId: context.pipelineId, flowId: context.flowId },
        context.jobName,
      )
    : await resolver.resolve({
        pipelineId: context.pipelineId,
        flowId: context.flowId,
      });

  return {
    provider: resolved.provider,
    model: resolved.model,
  };
}
