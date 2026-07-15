import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import { BFlowAgentPoolEntity, BFlowAgentPoolForm } from "./BFlowAgentPool.Types";

export class BFlowAgentPoolRepository extends PhazeRepository<BFlowAgentPoolEntity, string> {
  /**
   * Creates a new agent pool entity with default values
   */
  createDefault(): BFlowAgentPoolEntity {
    const now = new Date();
    return {
      id: "",
      code: "",
      name: "",
      slug: "",
      description: undefined,
      version: undefined,
      status: "draft",
      metadata: {},
      createdAt: now,
      updatedAt: now,
      agentCount: 0,
      swarmingConfig: {
        collaborationMode: "parallel",
        taskDistribution: "load-balancing",
        responseTimeoutMs: 30000,
        maxRetries: 3,
      },
      agentTemplate: {
        provider: undefined,
        model: undefined,
        systemPrompt: undefined,
        personality: {
          tone: "professional",
          formality: "formal",
          expertiseLevel: "mid-level",
        },
        capabilities: [],
        knowledgeDomains: [],
      },
    };
  }

  /**
   * Creates a new agent pool from form data
   */
  createFromForm(form: BFlowAgentPoolForm): BFlowAgentPoolEntity {
    const now = new Date();
    return {
      id: "",
      code: form.code,
      name: form.name,
      slug: form.slug,
      description: form.description,
      version: form.version,
      status: form.status || "draft",
      metadata: form.metadata || {},
      createdAt: now,
      updatedAt: now,
      agentCount: 0,
      swarmingConfig: form.swarmingConfig,
      agentTemplate: form.agentTemplate,
    };
  }

  /**
   * Updates an existing agent pool with form data
   */
  updateFromForm(
    existing: BFlowAgentPoolEntity,
    form: BFlowAgentPoolForm
  ): BFlowAgentPoolEntity {
    return {
      ...existing,
      code: form.code,
      name: form.name,
      slug: form.slug,
      description: form.description,
      version: form.version,
      status: form.status || existing.status,
      metadata: form.metadata || existing.metadata,
      updatedAt: new Date(),
      swarmingConfig: form.swarmingConfig || existing.swarmingConfig,
      agentTemplate: form.agentTemplate || existing.agentTemplate,
    };
  }
}
