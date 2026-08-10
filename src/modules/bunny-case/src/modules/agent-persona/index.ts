// agent-persona module — public exports

export { default as BCAgentPersonaComponent } from "./bc.agent-persona.component";
export { bcAgentPersonaModule } from "./bc.agent-persona.module";
export { default as BCAgentPersonaRepository } from "./bc.agent-persona.repository";
export { bcAgentPersonaGenerateProfile } from "./bc.agent-persona.server";
export type {
  BCAgentPersona,
  BCGeneratedAgentPersona,
} from "./bc.agent-persona.entity";
