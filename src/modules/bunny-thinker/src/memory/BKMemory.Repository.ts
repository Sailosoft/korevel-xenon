// BKMemory.Repository.ts
//
// Repository for BKMemory and BKMemoryNeuron entities.

import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import type { BKMemory, BKMemoryNeuron } from "./BKMemory.Types";

export class BKMemoryRepository extends PhazeRepository<BKMemory> {
  /**
   * Get all memories for a specific think.
   */
  async getByThinkId(thinkId: string): Promise<BKMemory[]> {
    const all = await this.set.toArray();
    return all.filter((m) => m.thinkId === thinkId);
  }
}

export class BKMemoryNeuronRepository extends PhazeRepository<BKMemoryNeuron> {
  /**
   * Get all neurons for a specific memory.
   */
  async getByMemoryId(memoryId: string): Promise<BKMemoryNeuron[]> {
    const all = await this.set.toArray();
    return all
      .filter((n) => n.memoryId === memoryId)
      .sort((a, b) => a.order - b.order);
  }
}
