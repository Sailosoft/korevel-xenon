import { BUIBookEntity } from "./bui.book.entity";
import BUIRepositoryAdminPanel from "../../database/bui.repository.admin-panel";
import { buiDatabase } from "../../database/bui.database";

export class BUIBookRepository extends BUIRepositoryAdminPanel<BUIBookEntity> {
  constructor() {
    super(buiDatabase.books);
  }
}
