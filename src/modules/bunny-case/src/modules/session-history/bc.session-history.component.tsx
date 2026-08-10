// bc.session-history.component.tsx

"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bcSessionHistoryModule } from "./bc.session-history.module";

export default function BCSessionHistoryComponent() {
  return (
    <Bunny config={bcSessionHistoryModule}>
      <BunnyForm />
    </Bunny>
  );
}
