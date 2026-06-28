// BKThoughts.Repository.ts
//
// Repository for BKThought and BKTrainOfThought entities.

import { BunnySelectOption } from "@/src/modules/bunny/src/form/BunnyForm.Interface";
import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import type { BKThought, BKTrainOfThought } from "./BKThoughts.Types";

export class BKThoughtRepository extends PhazeRepository<BKThought> {
  async toSelectOptions(): Promise<BunnySelectOption[]> {
    const items = await this.set.toArray();
    return items.map((item) => ({ label: item.name, value: item.id }));
  }

  /**
   * Search thoughts by name or content.
   */
  async search(query: string): Promise<BKThought[]> {
    const q = query.toLowerCase();
    const all = await this.set.toArray();
    return all.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.thought.toLowerCase().includes(q),
    );
  }

  /**
   * Get thoughts by pattern ID.
   */
  async getByPatternId(patternId: string): Promise<BKThought[]> {
    const all = await this.set.toArray();
    return all.filter((t) => t.patternId === patternId);
  }
}

export class BKTrainOfThoughtRepository extends PhazeRepository<BKTrainOfThought> {
  /**
   * Get all train of thoughts for a specific thought, ordered by sequence.
   */
  async getByThoughtId(thoughtId: string): Promise<BKTrainOfThought[]> {
    const all = await this.set.toArray();
    return all
      .filter((t) => t.thoughtId === thoughtId)
      .sort((a, b) => a.order - b.order);
  }
}
