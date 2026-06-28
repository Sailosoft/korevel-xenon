// BKThoughtPattern.Repository.ts
//
// Repository for BKThoughtPattern entities with domain-specific queries.

import { BunnySelectOption } from "@/src/modules/bunny/src/form/BunnyForm.Interface";
import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import type { BKThoughtPattern } from "./BKThoughtPattern.Types";

export class BKThoughtPatternRepository extends PhazeRepository<BKThoughtPattern> {
  async toSelectOptions(): Promise<BunnySelectOption[]> {
    const items = await this.set.toArray();
    return items.map((item) => ({ label: item.name, value: item.id }));
  }

  /**
   * Search thought patterns by name.
   */
  async search(query: string): Promise<BKThoughtPattern[]> {
    const q = query.toLowerCase();
    const all = await this.set.toArray();
    return all.filter((p) => p.name.toLowerCase().includes(q));
  }
}
