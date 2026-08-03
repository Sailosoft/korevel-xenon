// BSAgentPool.Types — Types for Bunny AI Studio Agent Pools
//
// Agent pools are agent groups that group agents. Ungrouped agents
// (no agentPoolId) are global agents.

export interface BSAgentPool {
  /** uuidv7 primary key */
  id: string;
  /** display name */
  name: string;
  /** optional description */
  description?: string;
  /** ISO datetime string */
  createdDate: string;
}

/** Form shape used when creating/editing an agent pool */
export type BSAgentPoolForm = Omit<BSAgentPool, "id" | "createdDate">;
