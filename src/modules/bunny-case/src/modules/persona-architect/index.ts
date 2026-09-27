// persona-architect module — public exports

export { default as BCPersonaComponent } from "./bc.persona.component";
export { bcPersonaModule } from "./bc.persona.module";
export { default as BCPersonaRepository } from "./bc.persona.repository";
export { bcPersonaGenerateProfile } from "./bc.persona.server";
export { BC_PERSONA_TRAITS } from "./bc.persona.traits";
export { default as BCPersonaTraitsField } from "./bc.persona.traits.field";
export type {
  BCCasePersona,
  BCGeneratedPersonaProfile,
  BCPersonaMode,
  BCPersonaModeOption,
} from "./bc.persona.entity";
export {
  BC_PERSONA_MODE_OPTIONS,
  bcPersonaMatchesMode,
  bcPersonaParseList,
  bcPersonaJoinList,
} from "./bc.persona.entity";
