// bc.playbook.repository.ts

import { bcDatabase } from "../../database/bc.database";
import BCRepositoryAdminPanel from "../../database/bc.repository.admin-panel";
import type { BCPlaybook } from "./bc.playbook.entity";

export default class BCPlaybookRepository extends BCRepositoryAdminPanel<BCPlaybook> {
  constructor() {
    super(bcDatabase.playbooks);
  }
}
