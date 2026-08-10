// bc.case.component.tsx

"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bcCaseModule } from "./bc.case.module";

export default function BCCaseComponent() {
  return (
    <Bunny config={bcCaseModule}>
      <BunnyForm />
    </Bunny>
  );
}
