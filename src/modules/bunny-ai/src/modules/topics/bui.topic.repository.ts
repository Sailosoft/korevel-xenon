import { buiDatabase } from "../../database/bui.database";
import BUIRepositoryAdminPanel from "../../database/bui.repository.admin-panel";
import { BUITopicEntity } from "./bui.topic.entity";

export class BUITopicRepository extends BUIRepositoryAdminPanel<BUITopicEntity> {
  constructor() {
    super(buiDatabase.topics);
  }
}
