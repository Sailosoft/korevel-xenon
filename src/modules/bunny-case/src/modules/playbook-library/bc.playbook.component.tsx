// bc.playbook.component.tsx

"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bcPlaybookModule } from "./bc.playbook.module";

export default function BCPlaybookComponent() {
  return (
    <Bunny config={bcPlaybookModule}>
      <BunnyForm />
    </Bunny>
  );
}
