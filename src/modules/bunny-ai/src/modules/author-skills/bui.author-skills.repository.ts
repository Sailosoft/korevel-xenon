import { buiDatabase } from "../../database/bui.database";
import BUIRepositoryAdminPanel from "../../database/bui.repository.admin-panel";
import { BUIAuthorSkill } from "./bui.author-skills.entity";

export default class BUIAuthorSkillRepository extends BUIRepositoryAdminPanel<BUIAuthorSkill> {
  constructor() {
    super(buiDatabase.authorSkills);
  }
}
