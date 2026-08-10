// bc.simulator-history.component.tsx

"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bcSimulatorHistoryModule } from "./bc.simulator-history.module";

export default function BCSimulatorHistoryComponent() {
  return (
    <Bunny config={bcSimulatorHistoryModule}>
      <BunnyForm />
    </Bunny>
  );
}
