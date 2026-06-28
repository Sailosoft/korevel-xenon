// BKIdeas.Repository.ts
//
// Repository for BKIdea entities with domain-specific queries.

import { BunnySelectOption } from "@/src/modules/bunny/src/form/BunnyForm.Interface";
import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import type { BKIdea } from "./BKIdeas.Types";

export class BKIdeaRepository extends PhazeRepository<BKIdea> {
  async toSelectOptions(): Promise<BunnySelectOption[]> {
    const items = await this.set.toArray();
    return items.map((item) => ({ label: item.name, value: item.id }));
  }

  /**
   * Search ideas by name, content, or tags.
   */
  async search(query: string): Promise<BKIdea[]> {
    const q = query.toLowerCase();
    const all = await this.set.toArray();
    return all.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.idea.toLowerCase().includes(q) ||
        i.tags?.toLowerCase().includes(q),
    );
  }

  /**
   * Get ideas by tag.
   */
  async getByTag(tag: string): Promise<BKIdea[]> {
    const all = await this.set.toArray();
    return all.filter(
      (i) => i.tags?.toLowerCase().includes(tag.toLowerCase()),
    );
  }
}
