// BKProcess.Repository.ts
//
// Repository for BKProcess entities with domain-specific queries to
// support the orchestration workflow.

import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import type { BKProcess } from "./BKProcess.Types";

export class BKProcessRepository extends PhazeRepository<BKProcess> {
  /**
   * Get all processes for a specific thought association.
   */
  async getByAssociationId(associationId: string): Promise<BKProcess[]> {
    const all = await this.set.toArray();
    return all
      .filter((p) => p.associationId === associationId)
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }

  /**
   * Get all processes for a specific thought.
   */
  async getByThoughtId(thoughtId: string): Promise<BKProcess[]> {
    const all = await this.set.toArray();
    return all
      .filter((p) => p.thoughtId === thoughtId)
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }

  /**
   * Get processes by their orchestration status.
   */
  async getByStatus(status: string): Promise<BKProcess[]> {
    const all = await this.set.toArray();
    return all
      .filter((p) => p.status === status)
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }

  /**
   * Get the most recent processes, ordered by creation date descending.
   */
  async getLatest(limit: number = 10): Promise<BKProcess[]> {
    const all = await this.set.toArray();
    return all
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .slice(0, limit);
  }

  /**
   * Get completed processes count.
   */
  async getCompletedCount(): Promise<number> {
    const all = await this.set.toArray();
    return all.filter((p) => p.status === "completed").length;
  }
}
