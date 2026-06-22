import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import type { PhazeRepositoryResult } from "@/src/modules/phaze/src/types/PhazeResult.Types";
import type { AdminPanelId } from "@/src/modules/admin-panel/features/id/admin-panel-id.interface";
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
   * Override create to ensure only one active config globally.
   */
  async create(
    data: BFlowGlobalAIConfigEntity,
  ): Promise<PhazeRepositoryResult<BFlowGlobalAIConfigEntity>> {
    // If active is not explicitly false, auto-activate and deactivate others
    if (data.active !== false) {
      await this.deactivateAll();
      data.active = true;
    }

    return super.create(data);
  }

  /**
   * Override update to ensure only one active config globally.
   */
  async update(
    id: AdminPanelId,
    data: BFlowGlobalAIConfigEntity,
  ): Promise<PhazeRepositoryResult<BFlowGlobalAIConfigEntity>> {
    // If setting active, deactivate all others first
    if (data.active === true) {
      await this.deactivateAll();
    }

    return super.update(id, data);
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
    const isActive = data.active ?? true;

    // If this config is being set active, deactivate all others first
    if (isActive) {
      await this.deactivateAll();
    }

    if (existing) {
      await this.set.update("global", {
        ...data,
        active: isActive,
        updatedAt: now,
      });
      return (await this.set.get("global")) as BFlowGlobalAIConfigEntity;
    }

    const entity: BFlowGlobalAIConfigEntity = {
      id: "global",
      provider: data.provider,
      model: data.model,
      active: isActive,
      createdAt: now,
      updatedAt: now,
    };
    await this.set.add(entity);
    return entity;
  }

  /**
   * Deactivate all global AI configs.
   */
  async deactivateAll(): Promise<void> {
    const all = await this.set.toArray();
    await Promise.all(
      all.map((c) =>
        this.set.update(c.id, { active: false, updatedAt: new Date() }),
      ),
    );
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
    return all.find((c) => c.flowId === flowId && c.active !== false);
  }

  /**
   * Get all active configs (one per flow).
   */
  async getAllActive(): Promise<BFlowFlowAIConfigEntity[]> {
    const all = await this.set.toArray();
    return all.filter((c) => c.active !== false);
  }

  /**
   * Deactivate all flow AI configs for a specific flow.
   * Ensures only one active config per flow.
   */
  async deactivateAllForFlow(flowId: string): Promise<void> {
    const all = await this.set.toArray();
    const forFlow = all.filter(
      (c) => c.flowId === flowId && c.active !== false,
    );
    await Promise.all(
      forFlow.map((c) =>
        this.set.update(c.id, { active: false, updatedAt: new Date() }),
      ),
    );
  }

  /**
   * Set a specific config as the only active one for its flow.
   */
  async setActive(configId: string): Promise<void> {
    const config = await this.set.get(configId);
    if (!config) return;

    // Deactivate all others for the same flow
    await this.deactivateAllForFlow(config.flowId);

    // Activate the target config
    await this.set.update(configId, { active: true, updatedAt: new Date() });
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

  /**
   * Deactivate all pipeline AI configs for a specific pipeline.
   * Ensures only one active config per pipeline.
   */
  async deactivateAllForPipeline(pipelineId: string): Promise<void> {
    const all = await this.set.toArray();
    const forPipeline = all.filter(
      (c) => c.pipelineId === pipelineId && c.active !== false,
    );
    await Promise.all(
      forPipeline.map((c) =>
        this.set.update(c.id, { active: false, updatedAt: new Date() }),
      ),
    );
  }

  /**
   * Set a specific config as the only active one for its pipeline.
   */
  async setActive(configId: string): Promise<void> {
    const config = await this.set.get(configId);
    if (!config) return;

    // Deactivate all others for the same pipeline
    await this.deactivateAllForPipeline(config.pipelineId);

    // Activate the target config
    await this.set.update(configId, { active: true, updatedAt: new Date() });
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
