"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bkMemoryModule } from "./BKMemoryModule";

export default function BKMemoryComponent() {
  return (
    <Bunny config={bkMemoryModule}>
      <BunnyForm />
    </Bunny>
  );
}
