// BSAgent.Repository — Repository for Bunny AI Studio Agents
//
// Provides agent-specific query helpers on top of PhazeRepository.
// Implements the GetWithoutAgentPoolId method described in the PLAN.

import { Table } from "dexie";
import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import type { BSAgent } from "./BSAgent.Types";

export class BSAgentRepository extends PhazeRepository<BSAgent> {
  constructor(table: Table<BSAgent>) {
    super(table);
  }

  /**
   * Get agents without an agentPoolId (global / ungrouped agents).
   */
  public async getWithoutAgentPoolId(): Promise<BSAgent[]> {
    return this.set.where("agentPoolId").equals("").toArray().then((empty) => {
      // Dexie index equality on empty string; also filter out undefined to be safe.
      return empty.filter((a) => !a.agentPoolId || a.agentPoolId === "");
    });
  }

  /**
   * Get agents for a specific agent pool.
   */
  public async getByAgentPoolId(poolId: string): Promise<BSAgent[]> {
    return this.set.where("agentPoolId").equals(poolId).toArray();
  }
}
