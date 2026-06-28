"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bkThoughtModule } from "./BKThoughtModule";

export default function BKThoughtComponent() {
  return (
    <Bunny config={bkThoughtModule}>
      <BunnyForm />
    </Bunny>
  );
}
