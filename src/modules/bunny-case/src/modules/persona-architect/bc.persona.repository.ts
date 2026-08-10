// bc.persona.repository.ts

import { bcDatabase } from "../../database/bc.database";
import BCRepositoryAdminPanel from "../../database/bc.repository.admin-panel";
import type { BCCasePersona } from "./bc.persona.entity";

export default class BCPersonaRepository extends BCRepositoryAdminPanel<BCCasePersona> {
  constructor() {
    super(bcDatabase.personas);
  }
}
