// bc.persona.component.tsx

"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bcPersonaModule } from "./bc.persona.module";

export default function BCPersonaComponent() {
  return (
    <Bunny config={bcPersonaModule}>
      <BunnyForm />
    </Bunny>
  );
}
