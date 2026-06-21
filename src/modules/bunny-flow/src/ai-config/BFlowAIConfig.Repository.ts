import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import type { HelixAIProvider } from "@/src/modules/helix";
import {
  BFlowGlobalAIConfigEntity,
  BFlowFlowAIConfigEntity,
  BFlowPipelineAIConfigEntity,
  BFlowResolvedAIConfig,
} from "./BFlowAIConfig.Types";

// ─── Global AI Config Repository ───────────────────────────────────

export class BFlowGlobalAIConfigRepository extends PhazeRepository<BFlowGlobalAIConfigEntity> {
  /**
   * Get the active global AI config.
   * Falls back to a default config (provider: "default", model: "default")
   * if none has been saved yet.
   */
  async getActive(): Promise<BFlowGlobalAIConfigEntity> {
    const all = await this.set.toArray();
    const active = all.find((c) => c.active !== false);
    if (active) return active;

    // Return a default config if nothing is configured
    return {
      id: "global",
      provider: "default",
      model: "default",
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Upsert the global AI config (always uses id="global").
   */
  async upsert(
    data: Partial<BFlowGlobalAIConfigEntity> & {
      provider: string;
      model: string;
    },
  ): Promise<BFlowGlobalAIConfigEntity> {
    const existing = await this.set.get("global");
    const now = new Date();

    if (existing) {
      await this.set.update("global", {
        ...data,
        updatedAt: now,
      });
      return (await this.set.get("global")) as BFlowGlobalAIConfigEntity;
    }

    const entity: BFlowGlobalAIConfigEntity = {
      id: "global",
      provider: data.provider,
      model: data.model,
      active: data.active ?? true,
      createdAt: now,
      updatedAt: now,
    };
    await this.set.add(entity);
    return entity;
  }
}

// ─── Flow AI Config Repository ─────────────────────────────────────

export class BFlowFlowAIConfigRepository extends PhazeRepository<BFlowFlowAIConfigEntity> {
  /**
   * Get the active AI config for a specific flow definition.
   */
  async getActiveByFlowId(
    flowId: string,
  ): Promise<BFlowFlowAIConfigEntity | undefined> {
    const all = await this.set.toArray();
    return all.find(
      (c) => c.flowId === flowId && c.active !== false,
    );
  }

  /**
   * Get all active configs (one per flow).
   */
  async getAllActive(): Promise<BFlowFlowAIConfigEntity[]> {
    const all = await this.set.toArray();
    return all.filter((c) => c.active !== false);
  }
}

// ─── Pipeline AI Config Repository ─────────────────────────────────

export class BFlowPipelineAIConfigRepository extends PhazeRepository<BFlowPipelineAIConfigEntity> {
  /**
   * Get the active AI config for a specific pipeline.
   */
  async getActiveByPipelineId(
    pipelineId: string,
  ): Promise<BFlowPipelineAIConfigEntity | undefined> {
    const all = await this.set.toArray();
    return all.find(
      (c) => c.pipelineId === pipelineId && c.active !== false,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
// AI Config Resolver — resolves effective config by precedence
// ═══════════════════════════════════════════════════════════════════

export class BFlowAIConfigResolver {
  constructor(
    private readonly globalRepo: BFlowGlobalAIConfigRepository,
    private readonly flowRepo: BFlowFlowAIConfigRepository,
    private readonly pipelineRepo: BFlowPipelineAIConfigRepository,
  ) {}

  /**
   * Resolve the effective AI config for a pipeline execution context.
   *
   * Precedence (highest wins):
   *   1. Pipeline-level config (with job-level overrides)
   *   2. Flow-level config
   *   3. Global config
   */
  async resolve(
    context: {
      pipelineId?: string;
      flowId?: string;
    },
  ): Promise<BFlowResolvedAIConfig> {
    // ── Try pipeline-level first ──────────────────────────────────
    if (context.pipelineId) {
      const pipelineConfig =
        await this.pipelineRepo.getActiveByPipelineId(context.pipelineId);
      if (pipelineConfig) {
        // Build per-job overrides from pipeline config
        const jobConfigs = new Map<
          string,
          { provider?: string; model?: string }
        >();
        for (const override of pipelineConfig.jobOverrides ?? []) {
          jobConfigs.set(override.jobName, {
            provider: override.provider,
            model: override.model,
          });
        }

        return {
          sourceLevel: "pipeline",
          provider: pipelineConfig.provider as HelixAIProvider,
          model: pipelineConfig.model,
          jobConfigs: jobConfigs.size > 0 ? jobConfigs : undefined,
        };
      }
    }

    // ── Try flow-level ───────────────────────────────────────────
    if (context.flowId) {
      const flowConfig = await this.flowRepo.getActiveByFlowId(
        context.flowId,
      );
      if (flowConfig) {
        return {
          sourceLevel: "flow",
          provider: flowConfig.provider as HelixAIProvider,
          model: flowConfig.model,
        };
      }
    }

    // ── Fall back to global ──────────────────────────────────────
    const globalConfig = await this.globalRepo.getActive();
    return {
      sourceLevel: "global",
      provider: globalConfig.provider as HelixAIProvider,
      model: globalConfig.model,
    };
  }

  /**
   * Resolve the effective AI config for a specific job within a pipeline.
   *
   * Precedence (highest wins):
   *   1. Pipeline job override (if jobName matches)
   *   2. Pipeline base config
   *   3. Flow-level config
   *   4. Global config
   */
  async resolveForJob(
    context: {
      pipelineId?: string;
      flowId?: string;
    },
    jobName: string,
  ): Promise<BFlowResolvedAIConfig> {
    const resolved = await this.resolve(context);

    // If resolved at pipeline level, check if there's a job override
    if (
      resolved.sourceLevel === "pipeline" &&
      resolved.jobConfigs?.has(jobName)
    ) {
      const jobOverride = resolved.jobConfigs.get(jobName)!;
      return {
        sourceLevel: "job",
        provider: (jobOverride.provider ?? resolved.provider) as HelixAIProvider,
        model: jobOverride.model ?? resolved.model,
      };
    }

    return resolved;
  }
}
