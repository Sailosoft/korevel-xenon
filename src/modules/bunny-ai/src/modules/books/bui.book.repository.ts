import { BUIBookEntity } from "./bui.book.entity";
import BUIRepositoryAdminPanel from "../../database/bui.repository.admin-panel";
import { buiDatabase } from "../../database/bui.database";
import { AdminPanelQueryOptions } from "@/src/modules/admin-panel/features/query/admin-panel-query.interface";
import { BuiRepositoryResult } from "../../database/bui.repository.interface";

export class BUIBookRepository extends BUIRepositoryAdminPanel<BUIBookEntity> {
  constructor() {
    super(buiDatabase.books);
  }

  // The Books list must never show outlines. Dexie indexing is intentionally
  // avoided because legacy books have no `kind` index, so filter in JS.
  async getList(
    _options: AdminPanelQueryOptions,
  ): Promise<BuiRepositoryResult<BUIBookEntity[]>> {
    const data = (await this.set.toArray()).filter(
      (book) => book.kind !== "outline",
    );

    return this.result.successList(data.reverse());
  }
}
