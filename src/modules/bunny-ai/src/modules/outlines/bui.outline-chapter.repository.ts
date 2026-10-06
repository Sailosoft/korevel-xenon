import { BUIBookChapterRepository } from "../books/bui.book-chapter.repository";
import { BUIOutlineItemEntity } from "./bui.outline.entity";

export class BUIOutlineChapterRepository extends BUIBookChapterRepository {
  /** All items for an outline (its book id), sorted by number. */
  async getItemsByOutline(
    outlineId: number,
  ): Promise<BUIOutlineItemEntity[]> {
    const rows = await this.set
      .where("bookId")
      .equals(outlineId)
      .sortBy("number");

    return rows as BUIOutlineItemEntity[];
  }

  /** Next sequential number after the highest existing item. */
  async getNextItemNumber(outlineId: number): Promise<number> {
    const rows = await this.getItemsByOutline(outlineId);

    if (rows.length === 0) return 1;

    return Math.max(...rows.map((row) => row.number)) + 1;
  }
}
