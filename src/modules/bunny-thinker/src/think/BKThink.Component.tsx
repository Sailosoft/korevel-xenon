"use client";


import Bunny from "@/src/modules/bunny/src/Bunny";
import { BKThinkModule } from "./BKThink.Module";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";

const bkThinkConfig = BKThinkModule.make();

export default function BKThinkComponent() {
  return (
    <Bunny config={bkThinkConfig}>
      <BunnyForm />
    </Bunny>
  );
}
