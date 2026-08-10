// bc.template.repository.ts

import { bcDatabase } from "../../database/bc.database";
import BCRepositoryAdminPanel from "../../database/bc.repository.admin-panel";
import type { BCCaseTemplate } from "./bc.template.entity";

export default class BCTemplateRepository extends BCRepositoryAdminPanel<BCCaseTemplate> {
  constructor() {
    super(bcDatabase.templates);
  }
}
