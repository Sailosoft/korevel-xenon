import { z } from "zod";

/**
 * BFlowDefinition - Core entity for a flow definition
 * Acts as a repository of flow, holding workspaces, agent pools, jobs, steps and resources.
 */
export const BFlowDefinitionSchema = z.object({
  /** GUIDv7 */
  id: z.string(),
  /** Unique code for flow, used for export and import key */
  code: z.string().min(1),
  /** Name of the flow */
  name: z.string().min(1),
  /** Slug */
  slug: z.string().min(1),
  /** Description of the flow */
  description: z.string().optional(),
  /** Version of the flow */
  version: z.string().optional(),
  /** Status of the flow */
  status: z
    .enum(["draft", "published", "archived"])
    .optional()
    .default("draft"),
  /** Metadata of the flow */
  metadata: z.record(z.string(), z.unknown()).optional(),
  /** Created timestamp */
  createdAt: z.date(),
  /** Updated timestamp */
  updatedAt: z.date(),
});

export type BFlowDefinitionEntity = z.infer<typeof BFlowDefinitionSchema>;
