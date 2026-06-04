import { buiDatabase } from "../../database/bui.database";
import BUIRepositoryAdminPanel from "../../database/bui.repository.admin-panel";
import { BUIAuthor } from "./bui.author.entity";

export default class BUIAuthorRepository extends BUIRepositoryAdminPanel<BUIAuthor> {
  constructor() {
    super(buiDatabase.authors);
  }
}
