import { BUIBookChapterEntity } from "./bui.book.entity";
import BUIRepositoryAdminPanel from "../../database/bui.repository.admin-panel";
import { buiDatabase } from "../../database/bui.database";
import { AdminPanelQueryOptions } from "@/src/modules/admin-panel/features/query/admin-panel-query.interface";
import { BuiRepositoryResult } from "../../database/bui.repository.interface";

export class BUIBookChapterRepository extends BUIRepositoryAdminPanel<BUIBookChapterEntity> {
  constructor() {
    super(buiDatabase.chapters);
  }
  async getList(
    _options: AdminPanelQueryOptions,
  ): Promise<BuiRepositoryResult<BUIBookChapterEntity[]>> {
    const bookId = _options.filter?.find((f) => f.field === "bookId")?.value;
    if (!bookId) {
      return this.result.errorList(404, "bookId filter is required");
    }

    const data = await this.set
      .where("bookId")
      .equals(Number(bookId))
      .sortBy("number");

    return this.result.successList(data);
  }

  // Filter chapters by bookId for the specific list view
  async getChaptersByBook(bookId: number) {
    return this.set.where("bookId").equals(bookId).sortBy("number");
  }
}
