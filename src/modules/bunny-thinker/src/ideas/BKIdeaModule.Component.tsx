"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bkIdeaModule } from "./BKIdeaModule";

export default function BKIdeaComponent() {
  return (
    <Bunny config={bkIdeaModule}>
      <BunnyForm />
    </Bunny>
  );
}
