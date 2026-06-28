"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bkThoughtPatternModule } from "./BKThoughtPatternModule";

export default function BKThoughtPatternComponent() {
  return (
    <Bunny config={bkThoughtPatternModule}>
      <BunnyForm />
    </Bunny>
  );
}
