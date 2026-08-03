// BSAgent.Types — Types for Bunny AI Studio Agents
//
// Mirrors the PLAN.md Agent table schema:
//  - name, agentPoolId?, persona, skills (comma separated), provider?, model?

import type { HelixAIProvider } from "@/src/modules/helix";

export interface BSAgent {
  /** uuidv7 primary key */
  id: string;
  /** display name */
  name: string;
  /** optional owning agent pool */
  agentPoolId?: string;
  /** persona / system instruction */
  persona: string;
  /** array of skills separated by comma "," */
  skills: string;
  /** optional provider override (helix provider string) */
  provider?: HelixAIProvider;
  /** optional model override (helix model) */
  model?: string;
}

/** Form shape used when creating/editing an agent (id generated on create) */
export type BSAgentForm = Omit<BSAgent, "id">;
