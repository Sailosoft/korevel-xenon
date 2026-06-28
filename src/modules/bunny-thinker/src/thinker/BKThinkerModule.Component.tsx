"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bkThinkerModule } from "./BKThinkerModule";

export default function BKThinkerComponent() {
  return (
    <Bunny config={bkThinkerModule}>
      <BunnyForm />
    </Bunny>
  );
}
