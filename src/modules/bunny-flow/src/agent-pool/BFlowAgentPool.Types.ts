import { z } from "zod";

// ─── Shared Primitives ─────────────────────────────────────────────

const GuidSchema = z.string().min(1);

/**
 * BFlowAgentPool - Core entity for an agent pool
 * Represents a group of AI agents that can be swarmed together to work as a team
 */
export const BFlowAgentPoolSchema = z.object({
  /** GUIDv7 */
  id: z.string(),
  /** Unique code for agent pool, used for export and import key */
  code: z.string().min(1),
  /** Name of the agent pool */
  name: z.string().min(1),
  /** Slug */
  slug: z.string().min(1),
  /** Description of the agent pool */
  description: z.string().optional(),
  /** Version of the agent pool */
  version: z.string().optional(),
  /** Status of the agent pool */
  status: z
    .enum(["draft", "active", "inactive", "archived"])
    .optional()
    .default("draft"),
  /** Metadata of the agent pool */
  metadata: z.record(z.string(), z.unknown()).optional(),
  /** Created timestamp */
  createdAt: z.date(),
  /** Updated timestamp */
  updatedAt: z.date(),
  /** Number of agents in this pool */
  agentCount: z.number().int().nonnegative().default(0),
  /** Configuration for swarming behavior */
  swarmingConfig: z.object({
    /** How agents should collaborate (sequential, parallel, hierarchical) */
    collaborationMode: z.enum(["sequential", "parallel", "hierarchical", "hybrid"]).default("parallel"),
    /** How tasks are distributed among agents */
    taskDistribution: z.enum(["round-robin", "load-balancing", "priority-based", "specialized"]).default("load-balancing"),
    /** Timeout for agent responses in milliseconds */
    responseTimeoutMs: z.number().int().nonnegative().default(30000),
    /** Maximum number of retries for failed agent tasks */
    maxRetries: z.number().int().nonnegative().default(3),
  }).optional(),
  /** Agent configuration template */
  agentTemplate: z.object({
    /** Base AI provider for agents in this pool */
    provider: z.string().min(1).optional(),
    /** Base AI model for agents in this pool */
    model: z.string().min(1).optional(),
    /** System prompt template for agents */
    systemPrompt: z.string().optional(),
    /** Personality traits for agents */
    personality: z.object({
      tone: z.enum(["professional", "friendly", "authoritative", "creative", "analytical"]).default("professional"),
      formality: z.enum(["formal", "semi-formal", "casual"]).default("formal"),
      expertiseLevel: z.enum(["junior", "mid-level", "senior", "expert"]).default("mid-level"),
    }).optional(),
    /** Capabilities and skills */
    capabilities: z.array(z.string()).default([]),
    /** Specialized knowledge domains */
    knowledgeDomains: z.array(z.string()).default([]),
  }).optional(),
});

export type BFlowAgentPoolEntity = z.infer<typeof BFlowAgentPoolSchema>;

// ─── Form Schema (user-editable fields only) ─────────────────────────

/**
 * Form schema for creating/updating an agent pool.
 * Excludes auto-generated fields: `id`, `createdAt`, `updatedAt`, `agentCount`.
 */
export const BFlowAgentPoolFormSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name must not be empty").max(256),
  slug: z.string().min(1, "Slug must not be empty").max(128),
  description: z.string().optional(),
  version: z.string().optional(),
  status: z
    .enum(["draft", "active", "inactive", "archived"])
    .optional()
    .default("draft"),
  metadata: z.record(z.string(), z.unknown()).optional(),
  swarmingConfig: z.object({
    collaborationMode: z.enum(["sequential", "parallel", "hierarchical", "hybrid"]).default("parallel"),
    taskDistribution: z.enum(["round-robin", "load-balancing", "priority-based", "specialized"]).default("load-balancing"),
    responseTimeoutMs: z.number().int().nonnegative().default(30000),
    maxRetries: z.number().int().nonnegative().default(3),
  }).optional(),
  agentTemplate: z.object({
    provider: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    systemPrompt: z.string().optional(),
    personality: z.object({
      tone: z.enum(["professional", "friendly", "authoritative", "creative", "analytical"]).default("professional"),
      formality: z.enum(["formal", "semi-formal", "casual"]).default("formal"),
      expertiseLevel: z.enum(["junior", "mid-level", "senior", "expert"]).default("mid-level"),
    }).optional(),
    capabilities: z.array(z.string()).default([]),
    knowledgeDomains: z.array(z.string()).default([]),
  }).optional(),
});

export type BFlowAgentPoolForm = z.infer<typeof BFlowAgentPoolFormSchema>;
