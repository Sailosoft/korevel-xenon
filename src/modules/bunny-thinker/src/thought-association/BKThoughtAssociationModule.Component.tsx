"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bkThoughtAssociationModule } from "./BKThoughtAssociationModule";

export default function BKThoughtAssociationComponent() {
  return (
    <Bunny config={bkThoughtAssociationModule}>
      <BunnyForm />
    </Bunny>
  );
}
