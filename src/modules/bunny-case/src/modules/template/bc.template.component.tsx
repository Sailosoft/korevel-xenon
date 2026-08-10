// bc.template.component.tsx

"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bcTemplateModule } from "./bc.template.module";

export default function BCTemplateComponent() {
  return (
    <Bunny config={bcTemplateModule}>
      <BunnyForm />
    </Bunny>
  );
}
