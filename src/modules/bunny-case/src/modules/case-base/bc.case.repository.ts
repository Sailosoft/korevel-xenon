// bc.case.repository.ts

import { bcDatabase } from "../../database/bc.database";
import BCRepositoryAdminPanel from "../../database/bc.repository.admin-panel";
import type { BCCaseScenario } from "./bc.case.entity";

export default class BCCaseRepository extends BCRepositoryAdminPanel<BCCaseScenario> {
  constructor() {
    super(bcDatabase.cases);
  }
}
