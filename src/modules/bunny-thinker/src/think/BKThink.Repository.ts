// BKThink.Repository.ts
//
// Repository for BKThink entities with domain-specific queries.

import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import type { BKThink } from "./BKThink.Types";

export class BKThinkRepository extends PhazeRepository<BKThink> {
  /**
   * Get thinks by status.
   */
  async getByStatus(status: string): Promise<BKThink[]> {
    const all = await this.set.toArray();
    return all
      .filter((t) => t.status === status)
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }

  /**
   * Get the latest thinks, ordered by creation date descending.
   */
  async getLatest(limit: number = 10): Promise<BKThink[]> {
    const all = await this.set.toArray();
    return all
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .slice(0, limit);
  }

  /**
   * Get thinks for a specific thought.
   */
  async getByThoughtId(thoughtId: string): Promise<BKThink[]> {
    const all = await this.set.toArray();
    return all
      .filter((t) => t.thoughtId === thoughtId)
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }
}
