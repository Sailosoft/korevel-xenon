import { buiDatabase } from "../../database/bui.database";
import BUIRepositoryAdminPanel from "../../database/bui.repository.admin-panel";
import { BUISetting } from "./bui.settings.entity";

export default class BUISettingsRepository extends BUIRepositoryAdminPanel<BUISetting> {
  constructor() {
    super(buiDatabase.settings);
  }
}
