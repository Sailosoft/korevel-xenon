// bc.agent-persona.repository.ts

import { bcDatabase } from "../../database/bc.database";
import BCRepositoryAdminPanel from "../../database/bc.repository.admin-panel";
import type { BCAgentPersona } from "./bc.agent-persona.entity";

export default class BCAgentPersonaRepository extends BCRepositoryAdminPanel<BCAgentPersona> {
  constructor() {
    super(bcDatabase.agentPersonas);
  }
}
