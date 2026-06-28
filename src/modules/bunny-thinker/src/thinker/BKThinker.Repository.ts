// BKThinker.Repository.ts
//
// Repository for BKThinker entities with domain-specific queries.

import { BunnySelectOption } from "@/src/modules/bunny/src/form/BunnyForm.Interface";
import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import type { BKThinker } from "./BKThinker.Types";

export class BKThinkerRepository extends PhazeRepository<BKThinker> {
  async toSelectOptions(): Promise<BunnySelectOption[]> {
    const items = await this.set.toArray();
    return items.map((item) => ({ label: item.name, value: item.id }));
  }

  /**
   * Get all thinkers by role.
   */
  async getByRole(role: string): Promise<BKThinker[]> {
    const all = await this.set.toArray();
    return all.filter((t) => t.role === role);
  }

  /**
   * Get all thinkers matching a specialization keyword.
   */
  async getBySpecialization(
    specialization: string,
  ): Promise<BKThinker[]> {
    const all = await this.set.toArray();
    return all.filter(
      (t) =>
        t.specialization?.toLowerCase().includes(specialization.toLowerCase()),
    );
  }

  /**
   * Search thinkers by name or description.
   */
  async search(query: string): Promise<BKThinker[]> {
    const q = query.toLowerCase();
    const all = await this.set.toArray();
    return all.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q),
    );
  }
}
