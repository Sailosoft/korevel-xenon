// bc.agent-persona.component.tsx

"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bcAgentPersonaModule } from "./bc.agent-persona.module";

export default function BCAgentPersonaComponent() {
  return (
    <Bunny config={bcAgentPersonaModule}>
      <BunnyForm />
    </Bunny>
  );
}
