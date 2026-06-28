// BKThoughtAssociation.Repository.ts
//
// Repository for BKThoughtAssociation entities with domain-specific queries.

import { BunnySelectOption } from "@/src/modules/bunny/src/form/BunnyForm.Interface";
import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import type { BKThoughtAssociation } from "./BKThoughtAssociation.Types";

export class BKThoughtAssociationRepository extends PhazeRepository<BKThoughtAssociation> {
  /**
   * Get all associations for a specific thought pattern.
   */
  async getByPatternId(patternId: string): Promise<BKThoughtAssociation[]> {
    const all = await this.set.toArray();
    return all.filter((a) => a.patternId === patternId);
  }

  /**
   * Convert all associations to select options for form fields.
   */
  async toSelectOptions(): Promise<BunnySelectOption[]> {
    const items = await this.set.toArray();
    return items.map((item) => ({
      label: item.name,
      value: item.id,
    }));
  }

  /**
   * Convert associations filtered by pattern ID to select options.
   */
  async toSelectOptionsByPatternId(patternId: string): Promise<BunnySelectOption[]> {
    const items = await this.set.toArray();
    return items
      .filter((item) => item.patternId === patternId)
      .map((item) => ({
        label: item.name,
        value: item.id,
      }));
  }
}
