import { z } from "zod";
import type { HelixAIProvider } from "@/src/modules/helix";

// ─── Shared Primitives ─────────────────────────────────────────────

const GuidSchema = z.string().min(1);

/**
 * Core AI configuration value — a provider + model pair.
 * Mirrors HelixAIOption but uses a Zod schema for validation.
 */
export const BFlowAIConfigValueSchema = z.object({
  provider: z.string().min(1, "Provider is required"),
  model: z.string().min(1, "Model is required"),
});

export type BFlowAIConfigValue = z.infer<typeof BFlowAIConfigValueSchema>;

// ─── Partial AI Config (for job-level overrides) ───────────────────

/**
 * A partial AI config used at the pipeline-job level.
 * Either field can be omitted, meaning "inherit from parent level".
 */
export const BFlowJobAIConfigSchema = z.object({
  /** The job name from the workflow template — used as the key */
  jobName: z.string().min(1),
  /** Provider override for this job (optional — inherit if omitted) */
  provider: z.string().optional(),
  /** Model override for this job (optional — inherit if omitted) */
  model: z.string().optional(),
});

export type BFlowJobAIConfig = z.infer<typeof BFlowJobAIConfigSchema>;

// ═══════════════════════════════════════════════════════════════════
// Level 1 — Global AI Config (bunny-flow workspace level)
// ═══════════════════════════════════════════════════════════════════

export const BFlowGlobalAIConfigSchema = z.object({
  /** Fixed id "global" */
  id: z.string(),
  /** AI provider */
  provider: z.string().min(1, "Provider is required"),
  /** AI model */
  model: z.string().min(1, "Model is required"),
  /** Whether this config is active */
  active: z.boolean().optional().default(true),
  /** Created timestamp */
  createdAt: z.date(),
  /** Updated timestamp */
  updatedAt: z.date(),
});

export type BFlowGlobalAIConfigEntity = z.infer<
  typeof BFlowGlobalAIConfigSchema
>;

/**
 * Form schema for global AI config.
 * Excludes auto-generated fields: `id`, `createdAt`, `updatedAt`.
 */
export const BFlowGlobalAIConfigFormSchema = z.object({
  provider: z.string().min(1, "Provider is required"),
  model: z.string().min(1, "Model is required"),
  active: z.boolean().optional().default(true),
});

export type BFlowGlobalAIConfigForm = z.infer<
  typeof BFlowGlobalAIConfigFormSchema
>;

// ═══════════════════════════════════════════════════════════════════
// Level 2 — Flow AI Config (per definition flow level)
// ═══════════════════════════════════════════════════════════════════

export const BFlowFlowAIConfigSchema = z.object({
  /** GUIDv7 */
  id: z.string(),
  /** Reference to BFlowDefinition */
  flowId: z.string().min(1, "Flow definition is required"),
  /** AI provider */
  provider: z.string().min(1, "Provider is required"),
  /** AI model */
  model: z.string().min(1, "Model is required"),
  /** Whether this config is active */
  active: z.boolean().optional().default(true),
  /** Created timestamp */
  createdAt: z.date(),
  /** Updated timestamp */
  updatedAt: z.date(),
});

export type BFlowFlowAIConfigEntity = z.infer<typeof BFlowFlowAIConfigSchema>;

/**
 * Form schema for flow-level AI config.
 * Excludes auto-generated fields: `id`, `createdAt`, `updatedAt`.
 */
export const BFlowFlowAIConfigFormSchema = z.object({
  flowId: z.string().min(1, "Flow definition is required"),
  provider: z.string().min(1, "Provider is required"),
  model: z.string().min(1, "Model is required"),
  active: z.boolean().optional().default(true),
});

export type BFlowFlowAIConfigForm = z.infer<typeof BFlowFlowAIConfigFormSchema>;

// ═══════════════════════════════════════════════════════════════════
// Level 3 — Pipeline AI Config (per pipeline level, with job overrides)
// ═══════════════════════════════════════════════════════════════════

export const BFlowPipelineAIConfigSchema = z.object({
  /** GUIDv7 */
  id: z.string(),
  /** Reference to BFlowPipeline */
  pipelineId: z.string().min(1, "Pipeline is required"),
  /** AI provider */
  provider: z.string().min(1, "Provider is required"),
  /** AI model */
  model: z.string().min(1, "Model is required"),
  /**
   * Per-job overrides.
   * Each job can optionally override provider/model for that specific job.
   */
  jobOverrides: z.array(BFlowJobAIConfigSchema).optional().default([]),
  /** Whether this config is active */
  active: z.boolean().optional().default(true),
  /** Created timestamp */
  createdAt: z.date(),
  /** Updated timestamp */
  updatedAt: z.date(),
});

export type BFlowPipelineAIConfigEntity = z.infer<
  typeof BFlowPipelineAIConfigSchema
>;

/**
 * Form schema for pipeline-level AI config.
 * Excludes auto-generated fields: `id`, `createdAt`, `updatedAt`.
 */
export const BFlowPipelineAIConfigFormSchema = z.object({
  pipelineId: z.string().min(1, "Pipeline is required"),
  provider: z.string().min(1, "Provider is required"),
  model: z.string().min(1, "Model is required"),
  jobOverrides: z.array(BFlowJobAIConfigSchema).optional().default([]),
  active: z.boolean().optional().default(true),
});

export type BFlowPipelineAIConfigForm = z.infer<
  typeof BFlowPipelineAIConfigFormSchema
>;

// ═══════════════════════════════════════════════════════════════════
// Resolved AI Config (flattened, ready for Helix consumption)
// ═══════════════════════════════════════════════════════════════════

/**
 * The fully-resolved AI configuration for a specific context.
 * This is what the runtime uses when calling Helix AI services.
 */
export interface BFlowResolvedAIConfig {
  /** The level this config was resolved from */
  sourceLevel: "global" | "flow" | "pipeline" | "job";
  /** The effective provider */
  provider: HelixAIProvider;
  /** The effective model */
  model: string;
  /**
   * Per-job resolved configs (only present when resolved at pipeline level).
   * Maps jobName -> { provider, model } where each field may inherit from parent.
   */
  jobConfigs?: Map<string, { provider?: string; model?: string }>;
}

// ─── Entity union type ─────────────────────────────────────────────

export type BFlowAnyAIConfigEntity =
  | BFlowGlobalAIConfigEntity
  | BFlowFlowAIConfigEntity
  | BFlowPipelineAIConfigEntity;
