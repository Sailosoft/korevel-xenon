import { Table } from "dexie";
import { AdminPanelQueryOptions } from "@/src/modules/admin-panel/features/query/admin-panel-query.interface";
import { BuiRepositoryResult } from "../../database/bui.repository.interface";
import BUIRepositoryAdminPanel from "../../database/bui.repository.admin-panel";
import { buiDatabase } from "../../database/bui.database";
import { BUIOutlineEntity } from "./bui.outline.entity";

/**
 * Outlines live in the shared `books` table but are discriminated by
 * `kind: "outline"`. The table is viewed through the outline entity so the
 * admin-panel CRUD surface is fully typed.
 */
export class BUIOutlineRepository extends BUIRepositoryAdminPanel<BUIOutlineEntity> {
  constructor() {
    super(buiDatabase.books as unknown as Table<BUIOutlineEntity>);
  }

  async getList(
    _options: AdminPanelQueryOptions,
  ): Promise<BuiRepositoryResult<BUIOutlineEntity[]>> {
    const data = (await this.set.toArray()).filter(
      (row) => row.kind === "outline",
    );

    return this.result.successList(data.reverse());
  }
}
