// BKThink.Repository.ts
//
// Repository for BKThink entities with domain-specific queries.

import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import type { BKThink } from "./BKThink.Types";
import type { AdminPanelQueryOptions } from "@/src/modules/admin-panel/features/query/admin-panel-query.interface";
import type { PhazeRepositoryResult } from "@/src/modules/phaze/src/types/PhazeResult.Types";

export class BKThinkRepository extends PhazeRepository<BKThink> {
  /**
   * Override default getList to sort by createdAt descending.
   * This makes query.getAll() return newest thinks first.
   */
  async getList(
    _options: AdminPanelQueryOptions,
  ): Promise<PhazeRepositoryResult<BKThink[]>> {
    const data = await this.set.toArray();
    data.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    return this.result.successList(data);
  }

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
